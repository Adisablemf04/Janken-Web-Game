
import { decideRPS } from "./rpsrules.js";

export function resolveThreeWay(choices) {

    const players = [
        { id: "player", choice: choices.player },
        { id: "npc1", choice: choices.npc1 },
        { id: "npc2", choice: choices.npc2 }
    ];

    const uniqueChoices = new Set(
        players.map(player => player.choice)
    );

    // All same or all different: restart the round
    if (uniqueChoices.size === 1 || uniqueChoices.size === 3) {
        return { type: "tie" };
    }

    // Find the symbol that two participants selected
    const repeatedChoice = players.find(player => {
        return players.filter(
            other => other.choice === player.choice
        ).length === 2;
    }).choice;

    // Two participants selected the same symbol
    const pair = players.filter(
        player => player.choice === repeatedChoice
    );

    // One participant selected a different symbol
    const single = players.find(
        player => player.choice !== repeatedChoice
    );

    // Check whether the pair beats the single participant
    const pairWins =
        decideRPS(repeatedChoice, single.choice) === "player";

    if (pairWins) {

        // Two winners must compete in a 1v1 duel
        return {
            type: "duel",
            contenders: pair.map(player => player.id),
            eliminated: single.id
        };
    }

    // The single participant defeated both opponents
    return {
        type: "point",
        winner: single.id
    };
}
