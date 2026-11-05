export function decideRPS(playerChoice, npcChoice) {

    // Same choices mean a tie
    if (playerChoice === npcChoice) {
        return "tie";
    }

    // Define which symbol defeats which
    const winsAgainst = {
        Rock: "Scissors",
        Paper: "Rock",
        Scissors: "Paper"
    };

    // Player wins if their choice defeats the NPC
    if (winsAgainst[playerChoice] === npcChoice) {
        return "player";
    }

    // Otherwise, the NPC wins
    return "npc";
}