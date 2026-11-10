import { getUsers, getCurrentUser } from "./accountStorage.js";
import { decideRPS } from "./rules/rpsrules.js";
import { ABILITIES, SHIELD_CHANCE, MIND_CHANCE, NPC_ABILITY_CHANCE } from "./rules/abilities.js";
const USERS_KEY = "ganken_users";

function createAbilities() {
    return {
        shieldUsed: false, shieldArmed: false,
        mindUsed: false, mindPending: false, strikeUsed: false
    };
}

function createMatch(level) {
    return {
        level, playerScore: 0, npcScore: 0,
        playerAbilities: createAbilities(), npcAbilities: createAbilities()
    };
}

function prepareGame(savedGame = {}) {
    const game = {
        currentCoins: 2, totalCoinsEarned: 0,
        highestLevelCompleted: 0, roundsWon: 0,
        matchesWon: 0, matchesLost: 0,
        activeMatch: null, pendingRetryLevels: [], isGameOver: false,
        ...savedGame
    };
    if (!Array.isArray(game.pendingRetryLevels)) game.pendingRetryLevels = [];
    game.nextLevel ??= game.activeMatch?.level ?? Math.min(game.highestLevelCompleted + 1, 5);
    game.replayUsed ??= false;
    game.endingResult ??= "";
    game.finalCoins ??= null;
    game.finalMatchesWon ??= 0;
    game.finalHighestLevelCompleted ??= 0;
    if (game.activeMatch) {
        const match = game.activeMatch;
        game.activeMatch = {
            ...createMatch(match.level), ...match,
            playerAbilities: { ...createAbilities(), ...match.playerAbilities },
            npcAbilities: { ...createAbilities(), ...match.npcAbilities }
        };
    }
    return game;
}

export function getGameData() {
    const user = getCurrentUser();
    return user ? prepareGame(user.game) : null;
}

export function updateGame(callback) {
    const currentUser = getCurrentUser();
    if (!currentUser) throw new Error("Please log in first.");
    const users = getUsers();
    const index = users.findIndex(user => user.id === currentUser.id);
    if (index === -1) throw new Error("Player account not found.");
    const game = prepareGame(users[index].game);
    const wasGameOver = game.isGameOver;
    const winsBefore = game.matchesWon;
    const activeLevel = game.activeMatch?.level;
    callback(game);
    if (activeLevel && !game.activeMatch && game.matchesWon > winsBefore) {
        game.nextLevel = activeLevel + 1;
    }
    if (!wasGameOver && game.isGameOver) {
        game.finalCoins = game.currentCoins;
        game.finalMatchesWon = game.matchesWon;
        game.finalHighestLevelCompleted = game.highestLevelCompleted;
    }
    users[index].game = game;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return game;
}

export function startOrResumeMatch(level) {
    return updateGame(game => {
        if (game.isGameOver) throw new Error("Your run has ended.");
        if (level < 1 || level > 4) throw new Error("Invalid level.");
        if (level !== game.nextLevel) {
            throw new Error(level < game.nextLevel
                ? "Level already completed. Move to the next level."
                : "This level is locked.");
        }
        if (game.pendingRetryLevels.includes(level)) {
            throw new Error("Pay 2 coins before retrying.");
        }
        if (game.activeMatch) {
            if (game.activeMatch.level !== level) {
                throw new Error(`Finish Level ${game.activeMatch.level} first.`);
            }
            return;
        }
        game.activeMatch = createMatch(level);
    });
}

export function buyAbility(level, ability) {
    if (level !== 2 || !ABILITIES[ability]) {
        throw new Error("This ability is unavailable.");
    }
    let message = "";
    const game = updateGame(state => {
        const match = state.activeMatch;
        if (state.isGameOver || !match || match.level !== level) {
            throw new Error("No active Level 2 match.");
        }
        const abilities = match.playerAbilities;
        if (abilities[`${ability}Used`]) throw new Error("You've already used this ability.");
        const cost = ABILITIES[ability].cost;
        if (state.currentCoins < cost) throw new Error("Not enough coins.");
        if (ability === "strike" && match.npcScore === 0) {
            throw new Error("The dealer has no points to remove.");
        }
        state.currentCoins -= cost;
        abilities[`${ability}Used`] = true;
        if (ability === "shield") {
            abilities.shieldArmed = true;
            message = "Lucky Shield activated! Awaiting a defeat.";
        } else if (ability === "mind") {
            abilities.mindPending = true;
            message = "Mind Trick ready for your next choice.";
        } else if (ability === "strike") {
            match.npcScore--;
            message = "Direct Strike! Dealer loses 1 point.";
        }
    });
    return { game, message };
}

function useNpcAbility(match) {
    if (Math.random() >= NPC_ABILITY_CHANCE) return null;
    const abilities = match.npcAbilities;
    const available = [];
    if (!abilities.shieldUsed) available.push("shield");
    if (!abilities.mindUsed) available.push("mind");
    if (!abilities.strikeUsed && match.playerScore > 0) available.push("strike");
    if (!available.length) return null;
    const ability = available[Math.floor(Math.random() * available.length)];
    abilities[`${ability}Used`] = true;
    if (ability === "shield") abilities.shieldArmed = true;
    else if (ability === "mind") abilities.mindPending = true;
    else if (ability === "strike") match.playerScore--;
    return ability;
}

export function playRPSRound(level, playerChoice) {
    const choices = ["Rock", "Paper", "Scissors"];
    if (!choices.includes(playerChoice)) throw new Error("Invalid RPS choice.");
    let round = null;
    const game = updateGame(state => {
        const match = state.activeMatch;
        if (state.isGameOver || !match || match.level !== level) {
            throw new Error("No active match.");
        }
        const npcAbility = level === 2 ? useNpcAbility(match) : null;
        let actualPlayerChoice = playerChoice;
        let playerMind = null, npcMind = null;
        if (match.npcAbilities.mindPending) {
            npcMind = Math.random() < MIND_CHANCE;
            if (npcMind) actualPlayerChoice = "Paper";
            match.npcAbilities.mindPending = false;
        }
        let npcChoice = choices[Math.floor(Math.random() * choices.length)];
        if (match.playerAbilities.mindPending) {
            playerMind = Math.random() < MIND_CHANCE;
            if (playerMind) npcChoice = "Paper";
            match.playerAbilities.mindPending = false;
        }
        const result = decideRPS(actualPlayerChoice, npcChoice);
        let blockedBy = null, pointAwarded = null;
        if (result === "player") {
            if (match.npcAbilities.shieldArmed) {
                match.npcAbilities.shieldArmed = false;
                if (Math.random() < SHIELD_CHANCE) blockedBy = "npc";
            }
            if (!blockedBy) {
                match.playerScore++;
                state.currentCoins++;
                state.totalCoinsEarned++;
                state.roundsWon++;
                pointAwarded = "player";
            }
        } else if (result === "npc") {
            if (match.playerAbilities.shieldArmed) {
                match.playerAbilities.shieldArmed = false;
                if (Math.random() < SHIELD_CHANCE) blockedBy = "player";
            }
            if (!blockedBy) {
                match.npcScore++;
                pointAwarded = "npc";
            }
        }
        let matchOutcome = null;
        if (match.playerScore >= 3) {
            matchOutcome = "player";
            state.matchesWon++;
            state.currentCoins += 2;
            state.totalCoinsEarned += 2;
            state.highestLevelCompleted = Math.max(state.highestLevelCompleted, level);
            state.activeMatch = null;
        } else if (match.npcScore >= 3) {
            matchOutcome = "npc";
            state.matchesLost++;
            if (!state.pendingRetryLevels.includes(level)) state.pendingRetryLevels.push(level);
            state.activeMatch = null;
            if (state.currentCoins < 2) state.isGameOver = true;
        }
        round = {
            playerChoice: actualPlayerChoice, npcChoice, result,
            npcAbility, playerMind, npcMind, blockedBy, pointAwarded,
            playerScore: match.playerScore, npcScore: match.npcScore, matchOutcome
        };
    });
    return { ...round, game };
}

export function payRetry(level) {
    return updateGame(game => {
        if (game.isGameOver) throw new Error("This run has ended.");
        if (!game.pendingRetryLevels.includes(level)) {
            throw new Error("No retry payment is required.");
        }
        if (game.currentCoins < 2) throw new Error("Not enough coins.");
        if (game.activeMatch) throw new Error("Finish your current match first.");
        game.currentCoins -= 2;
        game.pendingRetryLevels = game.pendingRetryLevels.filter(pendingLevel => pendingLevel !== level);
        game.activeMatch = createMatch(level);
    });
}

export function startReplayLevels() {
    return updateGame(game => {
        if (game.isGameOver || game.activeMatch || game.nextLevel !== 5) {
            throw new Error("Complete all four levels first.");
        }
        if (game.replayUsed) throw new Error("You already used Earn more coins.");
        if (game.pendingRetryLevels.length) throw new Error("Finish the pending retry first.");
        game.nextLevel = 1;
        game.replayUsed = true;
        game.endingResult = "";
    });
}

export function spinFinalWheel() {
    return updateGame(game => {
        if (game.isGameOver || game.activeMatch || game.nextLevel !== 5) {
            throw new Error("Complete all four levels first.");
        }
        if (Math.random() < 0.4) {
            game.currentCoins *= 2;
            game.endingResult = "doubled";
        } else {
            game.currentCoins = 0;
            game.endingResult = "ruined";
            game.isGameOver = true;
        }
    });
}

export function finishEnding() {
    return updateGame(game => {
        if (game.isGameOver || game.activeMatch || game.nextLevel !== 5) {
            throw new Error("Complete all four levels first.");
        }
        if (game.currentCoins < 20) throw new Error("Not enough coins to save Kareena. You need 20 coins.");
        game.endingResult = "saved";
        game.isGameOver = true;
    });
}

export function resetRun() {
    return updateGame(game => {
        game.currentCoins = 2;
        game.highestLevelCompleted = 0;
        game.nextLevel = 1;
        game.replayUsed = false;
        game.endingResult = "";
        game.activeMatch = null;
        game.pendingRetryLevels = [];
        game.isGameOver = false;
    });
}