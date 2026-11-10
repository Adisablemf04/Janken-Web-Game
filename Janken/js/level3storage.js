import { updateGame, startOrResumeMatch } from "./gameStorage.js";
import { decideRPS } from "./rules/rpsrules.js";
import { resolveThreeWay } from "./rules/threeway.js";
const SIGNS = ["Rock", "Paper", "Scissors"];

function randomSign() {
    return SIGNS[Math.floor(Math.random() * SIGNS.length)];
}

function getMatch(game) {
    if (game.isGameOver) throw new Error("This run has ended.");
    const match = game.activeMatch;
    if (!match || match.level !== 3) {
        throw new Error("There is no active Level 3 match.");
    }
    match.npc2Score ??= 0;
    match.duel ??= null;
    return match;
}

// Get all three scores
function getScores(match) {
    return {
        playerScore: match.playerScore,
        npc1Score: match.npcScore,
        npc2Score: match.npc2Score
    };
}

// Award a point and check for victory
function awardPoint(game, match, winner) {
    if (winner === "player") {
        match.playerScore++;
        game.currentCoins++;
        game.totalCoinsEarned++;
        game.roundsWon++;
    } else if (winner === "npc1") {
        match.npcScore++;
    } else if (winner === "npc2") {
        match.npc2Score++;
    }
    const scores = {
        player: match.playerScore,
        npc1: match.npcScore,
        npc2: match.npc2Score
    };
    if (scores[winner] < 3) return null;
    if (winner === "player") {
        game.matchesWon++;
        game.currentCoins += 2;
        game.totalCoinsEarned += 2;
        game.highestLevelCompleted = Math.max(game.highestLevelCompleted, 3);
    } else {
        game.matchesLost++;
        if (!game.pendingRetryLevels.includes(3)) {
            game.pendingRetryLevels.push(3);
        }
        if (game.currentCoins < 2) game.isGameOver = true;
    }
    game.activeMatch = null;
    return winner;
}

// Start or resume Level 3
export function startOrResumeLevel3() {
    startOrResumeMatch(3);
    return updateGame(game => getMatch(game));
}

// Three-player RPS
export function playThreeWay(playerChoice) {
    if (!SIGNS.includes(playerChoice)) {
        throw new Error("Invalid RPS sign.");
    }
    let resultData;
    const game = updateGame(game => {
        const match = getMatch(game);
        if (match.duel) throw new Error("Finish the current duel first.");
        const choices = {
            player: playerChoice,
            npc1: randomSign(),
            npc2: randomSign()
        };
        const result = resolveThreeWay(choices);
        let matchOutcome = null;
        if (result.type === "point") {
            matchOutcome = awardPoint(game, match, result.winner);
        } else if (result.type === "duel") {
            match.duel = {
                contenders: result.contenders,
                eliminated: result.eliminated
            };
        }
        resultData = {
            choices,
            type: result.type,
            winner: result.winner ?? null,
            duel: result.type === "duel" ? match.duel : null,
            ...getScores(match),
            matchOutcome
        };
    });
    return { ...resultData, game };
}

// Resolve the duel
export function playLevel3Duel(playerChoice = null) {
    let resultData;
    const game = updateGame(game => {
        const match = getMatch(game);
        if (!match.duel) throw new Error("There is no duel to resolve.");
        const { contenders, eliminated } = match.duel;
        const playerParticipates = contenders.includes("player");
        if (playerParticipates && !SIGNS.includes(playerChoice)) {
            throw new Error("Choose a valid sign for the duel.");
        }
        const choices = {};
        for (const actor of contenders) {
            choices[actor] = actor === "player" ? playerChoice : randomSign();
        }
        const [first, second] = contenders;
        const result = decideRPS(choices[first], choices[second]);
        let winner = null;
        if (result === "player") winner = first;
        else if (result === "npc") winner = second;
        match.duel = null;
        const matchOutcome = winner ? awardPoint(game, match, winner) : null;
        resultData = {
            choices,
            contenders,
            eliminated,
            type: winner ? "point" : "tie",
            winner,
            ...getScores(match),
            matchOutcome
        };
    });
    return { ...resultData, game };
}