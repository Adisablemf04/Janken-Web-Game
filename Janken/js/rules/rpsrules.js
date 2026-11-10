export function decideRPS(playerChoice, npcChoice) {
    if (playerChoice === npcChoice) {
        return "tie";
    }
    const winsAgainst = {
        Rock: "Scissors",
        Paper: "Rock",
        Scissors: "Paper"
    };
    if (winsAgainst[playerChoice] === npcChoice) {
        return "player";
    }
    return "npc";
}