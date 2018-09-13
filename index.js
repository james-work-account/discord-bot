const Creds = require("./creds")
const Discord = require('discord.js');
const client = new Discord.Client();
const prefix = "!roll";
const help = "!roll help";
const [noexpl, add, expl9, reroll1] = ["noexpl", "add", "expl9", "reroll1"]

const helptext = `\
-------------------------------------------------------------------------------------------------
Basic format: {number to roll}k{number to keep}
Examples:
  \`!roll 4k3\`
  \`!roll 10k10\`

Other arguments:
  - noexpl: No dice explode (eg: \`!roll 5k4 noexpl\`)
  - add {number to add}: Add a flat amount to your roll (eg: \`!roll 5k4 add 3\`)
  - expl9: Explode on 9's as well as 10's (eg: \`!roll 5k4 expl9\`)
  - reroll1: Re-roll 1's once per original 1 (eg: \`!roll 5k4 reroll1\`)

These arguments can be combined, for example: \`!roll 5k4 expl9 add 4\`
-------------------------------------------------------------------------------------------------`;

const rollKeepRegex = /(\d+)k(\d+)/;
const regexFailResponse = "Incorrect input format. Correct format example: `!roll 8k4` (k = keep)";
const numberComparisonFailResponse = "Number of dice kept is greater than number rolled.";
const ruleMap = new Map([
    [noexpl, "no explode"],
    [add, "add flat number"],
    [expl9, "explode on 9's"],
    [reroll1, "re-roll 1's"]
])

const formatOutput = function (array, sum, rules, extraAdded, message) {
    const authorToMention = message.author.toString();
    const sumBeforeExtra = +sum - +extraAdded;
    const ruleText = (rules != "") ? `Rule(s) applied: ${rules.map(rule => ruleMap.get(rule)).filter(n => n).map(x => `_${x}_`).join(", ")} - ` : "";
    const output = `${authorToMention} - ${ruleText}[ ${array.join(" + ")} = ${(sum != sumBeforeExtra ? `${sumBeforeExtra} + ${extraAdded} = ` : "")}_**${sum}**_ ]`;
    return output;
};

// ************ MATHS STUFF ************ //

const getNewNumber = function () {
    return Math.floor(Math.random() * 10 + 1)
}

const explode = function (numToExplode, explodeValue = 10) {
    const newNumber = getNewNumber();
    if (newNumber == explodeValue) {
        return explode(numToExplode + newNumber);
    } else {
        return numToExplode + newNumber;
    }
};

let getRolls = function (roll, keep, args = []) {
    let diceArray = (
        Array(roll)
        .fill() // empty array of size `roll`
        .map(_ => getNewNumber()) // fill with random numbers between 1 and 10
        .sort(function (a, b) {
            return b - a;
        }) // sort highest to lowest
    );
    let filteredArray = []
    // apply extra args
    if (args.includes(reroll1)) {
        diceArray = diceArray.map(x => {
            if (x == 1) {
                return getNewNumber();
            } else {
                return x;
            }
        });
    };
    filteredArray = diceArray.slice(0, keep);
    if (!args.includes(noexpl)) {
        filteredArray = filteredArray.map(x => {
            if (x == 10) {
                return explode(x);
            } else {
                return x;
            }
        });
    }
    let extraToAdd = 0
    for (arg in args) {
        if (args[arg] == expl9 && !args.includes(noexpl)) {
            filteredArray = filteredArray.map(x => {
                if (x == 9) {
                    return explode(x, 9);
                } else {
                    return x;
                }
            });
        };
        if (args[arg] == add) {
            extraToAdd = args[+arg + 1]
        }
    }
    const summedArray = +(filteredArray.reduce((a, b) => a + b, 0)) + +extraToAdd;

    return [filteredArray, summedArray, extraToAdd];
};

// ************ RUNNING THE BOT STUFF ************ //

client.on('ready', () => {
    console.log('Ready!');
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) {
        return;
    } else if (message.content.startsWith(help)) {
        message.channel.send(helptext);
    } else {
        const args = message.content.slice(prefix.length).trim().split(' ');
        const [rollInput, ...argsTail] = args;

        const response = (!rollKeepRegex.test(rollInput) ? regexFailResponse : function () {
            const arr = rollKeepRegex.exec(rollInput).map(x => +x); // get elements from regex capture groups, convert to Ints
            const [roll, keep] = [arr[1], arr[2]];
            return (!(roll >= keep) ? numberComparisonFailResponse : function () {
                const rollInfo = getRolls(roll, keep, argsTail);
                const [keepArray, rollTotal, extraAdded] = [rollInfo[0], rollInfo[1], rollInfo[2]];
                return formatOutput(keepArray, rollTotal, argsTail, extraAdded, message);
            }());
        }());

        message.channel.send(response);
    };
});

client.login(Creds.loginCred());