
import {
    getUsers,
    getCurrentUser
} from "./accountStorage.js";

import { decideRPS } from "./rules/rpsrules.js";

import {
    ABILITIES,
    SHIELD_CHANCE,
    MIND_CHANCE,
    NPC_ABILITY_CHANCE
} from "./rules/abilities.js";

const USERS_KEY = "ganken_users";

// Starting state of each participant's abilities
function createAbilities() {
    return {
        shieldUsed: false,
        shieldArmed: false,
        mindUsed: false,
        mindPending: false,
        strikeUsed: false
    };
}

// Create a fresh match
function createMatch(level) {
    return {
        level: level,
        playerScore: 0,
        npcScore: 0,

        playerAbilities: createAbilities(),
        npcAbilities: createAbilities()
    };
}

// Supply missing game fields for existing accounts
function prepareGame(savedGame = {}) {

    const game = {
        currentCoins: 2,
        totalCoinsEarned: 0,
        highestLevelCompleted: 0,
        roundsWon: 0,
        matchesWon: 0,
        matchesLost: 0,
        activeMatch: null,
        pendingRetryLevels: [],
        isGameOver: false,

        ...savedGame
    };

    if (!Array.isArray(game.pendingRetryLevels)) {
        game.pendingRetryLevels = [];
    }

    // Support matches saved before we added abilities
    if (game.activeMatch) {

        const match = game.activeMatch;

        game.activeMatch = {
            ...createMatch(match.level),
            ...match,

            playerAbilities: {
                ...createAbilities(),
                ...match.playerAbilities
            },

            npcAbilities: {
                ...createAbilities(),
                ...match.npcAbilities
            }
        };
    }

    return game;
}

// Retrieve the logged-in player's saved game data
export function getGameData() {

    const user = getCurrentUser();

    if (!user) {
        return null;
    }

    return prepareGame(user.game);
}

// Safely update one player's game data
export function updateGame(callback) {

    const currentUser = getCurrentUser();

    if (!currentUser) {
        throw new Error("Please log in first.");
    }

    const users = getUsers();

    const index = users.findIndex(
        user => user.id === currentUser.id
    );

    if (index === -1) {
        throw new Error("Player account not found.");
    }

    const game = prepareGame(users[index].game);

    callback(game);

    users[index].game = game;

    localStorage.setItem(
        USERS_KEY,
        JSON.stringify(users)
    );

    return game;
}

// Start a new match or restore a saved match
export function startOrResumeMatch(level) {

    return updateGame(game => {

        if (game.isGameOver) {
            throw new Error("Your run has ended.");
        }

        if (level < 1 || level > 4) {
            throw new Error("Invalid level.");
        }

        if (level > game.highestLevelCompleted + 1) {
            throw new Error("This level is locked.");
        }

        if (game.pendingRetryLevels.includes(level)) {
            throw new Error("Pay 2 coins before retrying.");
        }

        // Continue an unfinished match
        if (game.activeMatch) {

            if (game.activeMatch.level !== level) {
                throw new Error(
                    `Finish Level ${game.activeMatch.level} first.`
                );
            }

            return;
        }

        // Begin a fresh match
        game.activeMatch = createMatch(level);
    });
}

// Purchase and activate a player ability
export function buyAbility(level, ability) {

    if (level !== 2 || !ABILITIES[ability]) {
        throw new Error("This ability is unavailable.");
    }

    let message = "";

    const game = updateGame(state => {

        const match = state.activeMatch;

        if (
            state.isGameOver ||
            !match ||
            match.level !== level
        ) {
            throw new Error("No active Level 2 match.");
        }

        const abilities = match.playerAbilities;

        // Each ability can only be purchased once per match
        if (abilities[`${ability}Used`]) {
            throw new Error("You've already used this ability.");
        }

        const cost = ABILITIES[ability].cost;

        if (state.currentCoins < cost) {
            throw new Error("Not enough coins.");
        }

        // Direct Strike requires an opponent point
        if (ability === "strike" && match.npcScore === 0) {
            throw new Error(
                "The dealer has no points to remove."
            );
        }

        // Spend the ability's coins
        state.currentCoins -= cost;

        abilities[`${ability}Used`] = true;

        if (ability === "shield") {

            // Wait until the next incoming defeat
            abilities.shieldArmed = true;

            message = "Lucky Shield activated! Awaiting a defeat.";
        }

        else if (ability === "mind") {

            // Applies when the next RPS round is played
            abilities.mindPending = true;

            message = "Mind Trick ready for your next choice.";
        }

        else if (ability === "strike") {

            // Apply immediately, with no coin reward
            match.npcScore--;

            message = "Direct Strike! Dealer loses 1 point.";
        }
    });

    return {
        game,
        message
    };
}

// NPC attempts to use one ability before a round
function useNpcAbility(match) {

    if (Math.random() >= NPC_ABILITY_CHANCE) {
        return null;
    }

    const abilities = match.npcAbilities;
    const available = [];

    if (!abilities.shieldUsed) {
        available.push("shield");
    }

    if (!abilities.mindUsed) {
        available.push("mind");
    }

    // No point can be removed from a score of zero
    if (!abilities.strikeUsed && match.playerScore > 0) {
        available.push("strike");
    }

    if (available.length === 0) {
        return null;
    }

    const ability = available[
        Math.floor(Math.random() * available.length)
    ];

    abilities[`${ability}Used`] = true;

    if (ability === "shield") {
        abilities.shieldArmed = true;
    }

    else if (ability === "mind") {
        abilities.mindPending = true;
    }

    else if (ability === "strike") {
        match.playerScore--;
    }

    return ability;
}

// Play one RPS round and save its result
export function playRPSRound(level, playerChoice) {

    const choices = ["Rock", "Paper", "Scissors"];

    if (!choices.includes(playerChoice)) {
        throw new Error("Invalid RPS choice.");
    }

    let round = null;

    const game = updateGame(state => {

        const match = state.activeMatch;

        if (
            state.isGameOver ||
            !match ||
            match.level !== level
        ) {
            throw new Error("No active match.");
        }

        // NPC's 40% ability decision
        const npcAbility = level === 2
            ? useNpcAbility(match)
            : null;

        let actualPlayerChoice = playerChoice;

        let playerMind = null;
        let npcMind = null;

        // Dealer's Mind Trick may force the player to Paper
        if (match.npcAbilities.mindPending) {

            npcMind = Math.random() < MIND_CHANCE;

            if (npcMind) {
                actualPlayerChoice = "Paper";
            }

            match.npcAbilities.mindPending = false;
        }

        // Generate the dealer's original choice
        let npcChoice = choices[
            Math.floor(Math.random() * choices.length)
        ];

        // Player's Mind Trick may force the dealer to Paper
        if (match.playerAbilities.mindPending) {

            playerMind = Math.random() < MIND_CHANCE;

            if (playerMind) {
                npcChoice = "Paper";
            }

            match.playerAbilities.mindPending = false;
        }

        // Determine the RPS winner
        const result = decideRPS(
            actualPlayerChoice,
            npcChoice
        );

        let blockedBy = null;
        let pointAwarded = null;

        if (result === "player") {

            // Dealer's Lucky Shield blocks a defeat
            if (match.npcAbilities.shieldArmed) {

                match.npcAbilities.shieldArmed = false;

                if (Math.random() < SHIELD_CHANCE) {
                    blockedBy = "npc";
                }
            }

            // Only award coins if the point was not blocked
            if (!blockedBy) {

                match.playerScore++;

                state.currentCoins++;
                state.totalCoinsEarned++;
                state.roundsWon++;

                pointAwarded = "player";
            }
        }

        else if (result === "npc") {

            // Player's Lucky Shield blocks a defeat
            if (match.playerAbilities.shieldArmed) {

                match.playerAbilities.shieldArmed = false;

                if (Math.random() < SHIELD_CHANCE) {
                    blockedBy = "player";
                }
            }

            if (!blockedBy) {

                match.npcScore++;

                pointAwarded = "npc";
            }
        }

        let matchOutcome = null;

        // The first participant to 3 points wins
        if (match.playerScore >= 3) {

            matchOutcome = "player";

            state.matchesWon++;

            // Level completion bonus
            state.currentCoins += 2;
            state.totalCoinsEarned += 2;

            // Unlock the next door
            state.highestLevelCompleted = Math.max(
                state.highestLevelCompleted,
                level
            );

            state.activeMatch = null;
        }

        else if (match.npcScore >= 3) {

            matchOutcome = "npc";

            state.matchesLost++;

            if (!state.pendingRetryLevels.includes(level)) {
                state.pendingRetryLevels.push(level);
            }

            state.activeMatch = null;

            // Game Over if player cannot afford another attempt
            if (state.currentCoins < 2) {
                state.isGameOver = true;
            }
        }

        round = {
            playerChoice: actualPlayerChoice,
            npcChoice,
            result,
            npcAbility,
            playerMind,
            npcMind,
            blockedBy,
            pointAwarded,
            playerScore: match.playerScore,
            npcScore: match.npcScore,
            matchOutcome
        };
    });

    return {
        ...round,
        game
    };
}

// Spend 2 coins to retry the current level
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

        if (game.activeMatch) {
            throw new Error("Finish your current match first.");
        }

        game.currentCoins -= 2;

        game.pendingRetryLevels =
            game.pendingRetryLevels.filter(
                pendingLevel => pendingLevel !== level
            );

        // New match means fresh ability availability
        game.activeMatch = createMatch(level);
    });
}

// Start a new run after Game Over
export function resetRun() {

    return updateGame(game => {

        // Players begin each new run with 2 coins
        game.currentCoins = 2;

        game.highestLevelCompleted = 0;
        game.activeMatch = null;
        game.pendingRetryLevels = [];
        game.isGameOver = false;

        // Keep lifetime rankings and match statistics
    });
}
