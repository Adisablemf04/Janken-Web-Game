
import {
    updateGame,
    startOrResumeMatch
} from "./gameStorage.js";

import { decideRPS } from "./rules/rpsrules.js";
import { resolveThreeWay } from "./rules/threeway.js";

const SIGNS = ["Rock", "Paper", "Scissors"];

const ACTORS = ["player", "npc1", "npc2"];

function randomSign() {
    return SIGNS[Math.floor(Math.random() * SIGNS.length)];
}

// Get the currently active Level 3 match
function getMatch(game) {

    if (game.isGameOver) {
        throw new Error("This run has ended.");
    }

    const match = game.activeMatch;

    if (!match || match.level !== 3) {
        throw new Error("There is no active Level 3 match.");
    }

    // Extend our existing match format for three participants
    match.npc2Score ??= 0;
    match.duel ??= null;

    return match;
}

// Give a round point and check for match victory
function awardPoint(game, match, winner) {

    if (winner === "player") {

        match.playerScore++;

        game.currentCoins++;
        game.totalCoinsEarned++;
        game.roundsWon++;
    }

    else if (winner === "npc1") {
        match.npcScore++;
    }

    else if (winner === "npc2") {
        match.npc2Score++;
    }

    const score = {
        player: match.playerScore,
        npc1: match.npcScore,
        npc2: match.npc2Score
    }[winner];

    // The first participant to reach three wins
    if (score < 3) {
        return null;
    }

    if (winner === "player") {

        game.matchesWon++;

        // Two bonus coins for completing Level 3
        game.currentCoins += 2;
        game.totalCoinsEarned += 2;

        // Unlock Level 4
        game.highestLevelCompleted = Math.max(
            game.highestLevelCompleted, 3
        );

    } else {

        game.matchesLost++;

        // Losing requires payment before retrying
        if (!game.pendingRetryLevels.includes(3)) {
            game.pendingRetryLevels.push(3);
        }

        if (game.currentCoins < 2) {
            game.isGameOver = true;
        }
    }

    // The match is now completed
    game.activeMatch = null;

    return winner;
}

// Start or resume an existing Level 3 match
export function startOrResumeLevel3() {

    // Reuse our existing level-lock and retry checks
    startOrResumeMatch(3);

    // Add Level 3 data to the saved match
    return updateGame(game => {
        getMatch(game);
    });
}

// Play the initial three-person selection
export function playThreeWay(playerChoice) {

    if (!SIGNS.includes(playerChoice)) {
        throw new Error("Invalid RPS sign.");
    }

    let resultData;

    const game = updateGame(game => {

        const match = getMatch(game);

        if (match.duel) {
            throw new Error("Finish the current duel first.");
        }

        // NPCs select independently
        const choices = {
            player: playerChoice,
            npc1: randomSign(),
            npc2: randomSign()
        };

        const result = resolveThreeWay(choices);

        let matchOutcome = null;

        if (result.type === "point") {

            // One participant defeated two opponents
            matchOutcome = awardPoint(
                game, match, result.winner
            );
        }

        else if (result.type === "duel") {

            // Save who remains in the 1v1
            match.duel = {
                contenders: result.contenders,
                eliminated: result.eliminated
            };
        }

        // A three-way tie does not change any scores

        resultData = {
            choices,
            type: result.type,
            winner: result.winner ?? null,
            duel: result.type === "duel" ? match.duel : null,
            playerScore: match.playerScore,
            npc1Score: match.npcScore,
            npc2Score: match.npc2Score,
            matchOutcome
        };
    });

    return {
        ...resultData,
        game
    };
}

// Resolve the duel between the two surviving participants
export function playLevel3Duel(playerChoice = null) {

    let resultData;

    const game = updateGame(game => {

        const match = getMatch(game);

        if (!match.duel) {
            throw new Error("There is no duel to resolve.");
        }

        const { contenders, eliminated } = match.duel;

        const playerParticipates =
            contenders.includes("player");

        if (
            playerParticipates &&
            !SIGNS.includes(playerChoice)
        ) {
            throw new Error("Choose a valid sign for the duel.");
        }

        // Both duel participants choose fresh signs
        const choices = {};

        for (const actor of contenders) {

            choices[actor] = actor === "player"
                ? playerChoice
                : randomSign();
        }

        const first = contenders[0];
        const second = contenders[1];

        const result = decideRPS(
            choices[first],
            choices[second]
        );

        let winner = null;
        let matchOutcome = null;

        if (result === "player") {
            winner = first;
        }

        else if (result === "npc") {
            winner = second;
        }

        // The temporary elimination ends with this duel
        match.duel = null;

        if (winner) {

            // Duel winner receives the round point
            matchOutcome = awardPoint(
                game, match, winner
            );
        }

        // A tied duel restarts the full three-player round

        resultData = {
            choices,
            contenders,
            eliminated,
            type: winner ? "point" : "tie",
            winner,
            playerScore: match.playerScore,
            npc1Score: match.npcScore,
            npc2Score: match.npc2Score,
            matchOutcome
        };
    });

    return {
        ...resultData,
        game
    };
}
