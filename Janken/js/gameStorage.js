
import {
    getUsers,
    getCurrentUser
} from "./accountStorage.js";

const USERS_KEY = "ganken_users";

// Provide default values for existing accounts
function prepareGame(game = {}) {

    return {
        currentCoins: 0,
        totalCoinsEarned: 0,
        highestLevelCompleted: 0,
        roundsWon: 0,
        matchesWon: 0,
        matchesLost: 0,
        activeMatch: null,
        pendingRetryLevels: [],
        isGameOver: false,

        ...game,

        pendingRetryLevels: Array.isArray(
            game.pendingRetryLevels
        ) ? [...game.pendingRetryLevels] : []
    };
}

// Read the currently logged-in player's game data
export function getGameData() {

    const user = getCurrentUser();

    if (!user) {
        return null;
    }

    return prepareGame(user.game);
}

// Update the player's game data in localStorage
function updateGame(change) {

    const currentUser = getCurrentUser();

    if (!currentUser) {
        throw new Error("No player is logged in.");
    }

    const users = getUsers();

    const index = users.findIndex(
        user => user.id === currentUser.id
    );

    if (index === -1) {
        throw new Error("Player account not found.");
    }

    const game = prepareGame(users[index].game);

    // Apply the requested changes
    change(game);

    // Save the updated account list as JSON
    users[index].game = game;

    localStorage.setItem(
        USERS_KEY,
        JSON.stringify(users)
    );

    return game;
}

// Start a new match or resume an unfinished one
export function startOrResumeMatch(level) {

    return updateGame(game => {

        if (game.isGameOver) {
            throw new Error("This run has ended.");
        }

        if (level > game.highestLevelCompleted + 1) {
            throw new Error("This level is locked.");
        }

        if (game.pendingRetryLevels.includes(level)) {
            throw new Error("You must pay to retry.");
        }

        if (game.activeMatch) {

            if (game.activeMatch.level !== level) {
                throw new Error(
                    `Finish Level ${game.activeMatch.level} first.`
                );
            }

            return;
        }

        game.activeMatch = {
            level: level,
            playerScore: 0,
            npcScore: 0
        };
    });
}

// Record one RPS round and its rewards
export function saveRound(level, result) {

    if (!["player", "npc", "tie"].includes(result)) {
        throw new Error("Invalid RPS result.");
    }

    let roundScores = null;
    let matchOutcome = null;

    const game = updateGame(state => {

        const match = state.activeMatch;

        if (
            state.isGameOver ||
            !match ||
            match.level !== level
        ) {
            throw new Error("No active match for this level.");
        }

        if (result === "player") {

            match.playerScore++;

            // Earn one coin per winning round
            state.currentCoins++;
            state.totalCoinsEarned++;
            state.roundsWon++;
        }

        else if (result === "npc") {
            match.npcScore++;
        }

        // A tie changes neither score nor coins

        roundScores = {
            playerScore: match.playerScore,
            npcScore: match.npcScore
        };

        // Player wins the match
        if (match.playerScore >= 3) {

            matchOutcome = "player";

            // Level completion bonus
            state.currentCoins += 2;
            state.totalCoinsEarned += 2;

            state.matchesWon++;

            // Unlock the next level
            state.highestLevelCompleted = Math.max(
                state.highestLevelCompleted,
                level
            );

            state.activeMatch = null;
        }

        // NPC wins the match
        else if (match.npcScore >= 3) {

            matchOutcome = "npc";

            state.matchesLost++;

            // Remember that retry payment is required
            if (!state.pendingRetryLevels.includes(level)) {
                state.pendingRetryLevels.push(level);
            }

            state.activeMatch = null;

            // Cannot afford a retry
            if (state.currentCoins < 2) {
                state.isGameOver = true;
            }
        }
    });

    return {
        game,
        roundScores,
        matchOutcome
    };
}

// Pay two coins to retry a defeated level
export function payRetry(level) {

    return updateGame(game => {

        if (game.isGameOver) {
            throw new Error("This run has ended.");
        }

        if (!game.pendingRetryLevels.includes(level)) {
            throw new Error("No retry payment is required.");
        }

        if (game.currentCoins < 2) {
            throw new Error("Not enough coins.");
        }

        if (
            game.activeMatch &&
            game.activeMatch.level !== level
        ) {
            throw new Error(
                `Finish Level ${game.activeMatch.level} first.`
            );
        }

        // Spend exactly two coins
        game.currentCoins -= 2;

        // Remove this level's retry requirement
        game.pendingRetryLevels =
            game.pendingRetryLevels.filter(
                pendingLevel => pendingLevel !== level
            );

        // Begin a fresh match
        game.activeMatch = {
            level: level,
            playerScore: 0,
            npcScore: 0
        };
    });
}

// Start a completely new run after Game Over
export function resetRun() {

    return updateGame(game => {

        game.currentCoins = 2;
        game.highestLevelCompleted = 0;
        game.activeMatch = null;
        game.pendingRetryLevels = [];
        game.isGameOver = false;

        // Lifetime account statistics are preserved
    });
}