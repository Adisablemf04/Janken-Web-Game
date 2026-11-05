
import { updateGame, startOrResumeMatch } from "./gameStorage.js";
import { decideRPS } from "./rules/rpsrules.js";
import { resolveThreeWay } from "./rules/threeway.js";
import { ABILITIES, SHIELD_CHANCE, MIND_CHANCE } from "./rules/abilities.js";

const SIGNS = ["Rock", "Paper", "Scissors"];
const ACTORS = ["player", "npc1", "npc2"];

function randomSign(except = null) {
    const choices = SIGNS.filter(sign => sign !== except);
    return choices[Math.floor(Math.random() * choices.length)];
}

function defaultAbilities() {
    return {
        shieldUsed: false, shieldArmed: false,
        mindUsed: false, mindPending: false,
        mindTarget: null, strikeUsed: false
    };
}

function getMatch(game) {
    if (game.isGameOver) throw new Error("This run has ended.");
    const match = game.activeMatch;
    if (!match || match.level !== 4) {
        throw new Error("No active Level 4 match.");
    }

    match.npc2Score ??= 0;
    match.phase ??= "first";
    match.firstChoices ??= null;
    match.duel ??= null;
    delete match.deadline;

    // Only the player can use abilities; clear old NPC ability data.
    match.playerAbilities = { ...defaultAbilities(), ...match.playerAbilities };
    match.npcAbilities = defaultAbilities();
    match.npc2Abilities = defaultAbilities();

    if (!["first", "second", "duel", "npcDuel", "between"].includes(match.phase)) {
        newRound(match);
    }
    return match;
}

function score(match, actor) {
    if (actor === "player") return match.playerScore;
    return actor === "npc1" ? match.npcScore : match.npc2Score;
}

function setScore(match, actor, value) {
    if (actor === "player") match.playerScore = value;
    else if (actor === "npc1") match.npcScore = value;
    else match.npc2Score = value;
}

function scores(match) {
    return {
        playerScore: match.playerScore,
        npc1Score: match.npcScore,
        npc2Score: match.npc2Score
    };
}

function newRound(match) {
    match.phase = "first";
    match.firstChoices = null;
    match.duel = null;
}

function endRound(match) {
    match.phase = "between";
    match.firstChoices = null;
    match.duel = null;
}

// Lucky Shield belongs to the player only.
function shieldBlocks(match, losers, notes) {
    if (!losers.includes("player") || !match.playerAbilities.shieldArmed) {
        return false;
    }
    match.playerAbilities.shieldArmed = false;
    const success = Math.random() < SHIELD_CHANCE;
    notes.push(`YOUR SHIELD ${success ? "BLOCKED" : "FAILED"}`);
    return success;
}

function awardPoint(game, match, winner, notes) {
    setScore(match, winner, score(match, winner) + 1);

    if (winner === "player") {
        game.currentCoins++;
        game.totalCoinsEarned++;
        game.roundsWon++;
        notes.push("+1 COIN");
    }

    if (score(match, winner) < 3) {
        endRound(match);
        return null;
    }

    if (winner === "player") {
        game.matchesWon++;
        game.currentCoins += 2;
        game.totalCoinsEarned += 2;
        game.highestLevelCompleted = Math.max(game.highestLevelCompleted, 4);
    } else {
        game.matchesLost++;
        if (!game.pendingRetryLevels.includes(4)) {
            game.pendingRetryLevels.push(4);
        }
        if (game.currentCoins < 2) game.isGameOver = true;
    }
    game.activeMatch = null;
    return winner;
}

// Only the player's Mind Trick can change an NPC's choice.
function applyMind(match, choices, available, notes) {
    const state = match.playerAbilities;
    if (!state.mindPending) return;
    const target = state.mindTarget;
    if (!Object.hasOwn(choices, target)) return;

    state.mindPending = false;
    state.mindTarget = null;
    const success = available[target].includes("Paper") && Math.random() < MIND_CHANCE;
    if (success) choices[target] = "Paper";
    notes.push(`YOUR MIND TRICK ${success ? "WORKED" : "FAILED"}`);
}

function resolveThreePlayers(game, match, choices, notes) {
    const result = resolveThreeWay(choices);
    if (result.type === "tie") {
        endRound(match);
        return { type: "tie" };
    }
    if (result.type === "duel") {
        if (shieldBlocks(match, [result.eliminated], notes)) {
            endRound(match);
            return { type: "shield" };
        }
        match.duel = {
            contenders: [...result.contenders],
            eliminated: result.eliminated
        };
        match.phase = match.duel.contenders.includes("player") ? "duel" : "npcDuel";
        return { type: "duel", duel: match.duel };
    }

    const losers = ACTORS.filter(actor => actor !== result.winner);
    if (shieldBlocks(match, losers, notes)) {
        endRound(match);
        return { type: "shield" };
    }
    return {
        type: "point", winner: result.winner,
        matchOutcome: awardPoint(game, match, result.winner, notes)
    };
}

function resolveDuel(game, match, choices, notes) {
    const [first, second] = match.duel.contenders;
    const comparison = decideRPS(choices[first], choices[second]);
    if (comparison === "tie") {
        endRound(match);
        return { type: "duel-tie" };
    }
    const winner = comparison === "player" ? first : second;
    const loser = winner === first ? second : first;
    if (shieldBlocks(match, [loser], notes)) {
        endRound(match);
        return { type: "shield" };
    }
    return {
        type: "point", winner,
        matchOutcome: awardPoint(game, match, winner, notes)
    };
}

export function startOrResumeLevel4() {
    startOrResumeMatch(4);
    return updateGame(game => getMatch(game));
}

export function buyLevel4Ability(key, target = null) {
    if (!ABILITIES[key]) throw new Error("Unknown ability.");
    let message = "";

    const game = updateGame(game => {
        const match = getMatch(game);
        if (!["first", "second", "duel"].includes(match.phase)) {
            throw new Error("Abilities are only available before a choice.");
        }
        const state = match.playerAbilities;
        if (state[`${key}Used`]) throw new Error("Already used this match.");
        if (game.currentCoins < ABILITIES[key].cost) throw new Error("Not enough coins.");

        if (key === "mind" && match.phase === "first") {
            throw new Error("Mind Trick is available from Selection 2.");
        }
        if (key === "mind" || key === "strike") {
            if (!["npc1", "npc2"].includes(target)) {
                throw new Error("Select NPC 1 or NPC 2.");
            }
            if (match.phase === "duel" && !match.duel.contenders.includes(target)) {
                throw new Error("That NPC is not in this duel.");
            }
        }
        if (key === "mind" && match.phase === "second" &&
            match.firstChoices[target] === "Paper") {
            throw new Error("That NPC cannot choose Paper again.");
        }
        if (key === "strike" && score(match, target) === 0) {
            throw new Error("That NPC has no points to remove.");
        }

        game.currentCoins -= ABILITIES[key].cost;
        state[`${key}Used`] = true;
        if (key === "shield") {
            state.shieldArmed = true;
            message = "Lucky Shield armed.";
        } else if (key === "mind") {
            state.mindPending = true;
            state.mindTarget = target;
            message = `Mind Trick targets ${target.toUpperCase()}.`;
        } else {
            setScore(match, target, score(match, target) - 1);
            message = `${target.toUpperCase()} loses one point!`;
        }
    });
    return { game, message };
}

export function chooseLevel4(sign) {
    if (!SIGNS.includes(sign)) throw new Error("Invalid sign.");
    let event;
    let finalScores;

    const game = updateGame(game => {
        const match = getMatch(game);
        const notes = [];

        if (match.phase === "first") {
            match.firstChoices = {
                player: sign, npc1: randomSign(), npc2: randomSign()
            };
            match.phase = "second";
            event = { type: "first", choices: { ...match.firstChoices }, notes };
        } else if (match.phase === "second") {
            const first = match.firstChoices;
            if (sign === first.player) throw new Error("Choose a different sign.");
            const available = {
                player: SIGNS.filter(x => x !== first.player),
                npc1: SIGNS.filter(x => x !== first.npc1),
                npc2: SIGNS.filter(x => x !== first.npc2)
            };
            const choices = {
                player: sign,
                npc1: randomSign(first.npc1),
                npc2: randomSign(first.npc2)
            };
            applyMind(match, choices, available, notes);
            event = { ...resolveThreePlayers(game, match, choices, notes), choices, notes };
        } else if (match.phase === "duel") {
            const opponent = match.duel.contenders.find(x => x !== "player");
            const choices = { player: sign, [opponent]: randomSign() };
            // All signs are restored in the duel.
            const available = { player: SIGNS, npc1: SIGNS, npc2: SIGNS };
            applyMind(match, choices, available, notes);
            event = { ...resolveDuel(game, match, choices, notes), choices, notes };
        } else {
            throw new Error("No sign is needed now.");
        }
        finalScores = scores(match);
    });
    return { ...event, game, scores: finalScores };
}

export function resolveNpcLevel4Duel() {
    let event;
    let finalScores;
    const game = updateGame(game => {
        const match = getMatch(game);
        if (match.phase !== "npcDuel") throw new Error("No NPC duel is pending.");
        const [first, second] = match.duel.contenders;
        const notes = [];
        const choices = { [first]: randomSign(), [second]: randomSign() };
        event = { ...resolveDuel(game, match, choices, notes), choices, notes };
        finalScores = scores(match);
    });
    return { ...event, game, scores: finalScores };
}

export function nextLevel4Round() {
    return updateGame(game => {
        const match = getMatch(game);
        if (match.phase !== "between") throw new Error("Finish this round first.");
        newRound(match);
    });
}
