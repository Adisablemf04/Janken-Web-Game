import { decideRPS } from "./rpsrules.js";
export function resolveThreeWay(choices) {

    const players = [
        { id: "player", choice: choices.player },
        { id: "npc1", choice: choices.npc1 },
        { id: "npc2", choice: choices.npc2 }
    ];

    const uniqueChoices = new Set(
        players.map(p => p.choice)
    );

    if (uniqueChoices.size !== 2) {
        return { type: "tie" };
    }

    const repeatedChoice =
        choices.player === choices.npc1 ||
        choices.player === choices.npc2
            ? choices.player
            : choices.npc1;

    const pair = players.filter(
        p => p.choice === repeatedChoice
    );

    const single = players.find(
        p => p.choice !== repeatedChoice
    );

    if (decideRPS(repeatedChoice, single.choice) === "player") {
        return {
            type: "duel",
            contenders: pair.map(p => p.id),
            eliminated: single.id
        };
    }

    return {
        type: "point",
        winner: single.id
    };
}