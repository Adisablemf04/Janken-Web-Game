
import {
    getUsers,
    getCurrentUser
} from "./accountStorage.js";

// Get registered players and current account
const users = getUsers();
const currentUser = getCurrentUser();

// Get the ranking table
const rankingBody = document.getElementById("ranking_body");
const emptyMessage = document.getElementById("ranking_empty");

// Sort by total coins earned (highest first)
const ranking = [...users].sort((a, b) => {

    const coinsA = a.game?.totalCoinsEarned ?? 0;
    const coinsB = b.game?.totalCoinsEarned ?? 0;

    // Use matches won when total coins are equal
    if (coinsA === coinsB) {
        const winsA = a.game?.matchesWon ?? 0;
        const winsB = b.game?.matchesWon ?? 0;

        return winsB - winsA;
    }

    return coinsB - coinsA;
});

// Display the players
if (ranking.length === 0) {

    emptyMessage.hidden = false;

} else {

    ranking.forEach((user, index) => {

        // Create a new table row
        const row = document.createElement("tr");

        // Highlight the logged-in player
        if (currentUser && user.id === currentUser.id) {
            row.classList.add("current_player");
        }

        // Information to display
        const playerData = [
            index + 1,
            user.username,
            user.game?.totalCoinsEarned ?? 0,
            user.game?.matchesWon ?? 0,
            user.game?.highestLevelCompleted ?? 0
        ];

        // Create table cells
        playerData.forEach(value => {

            const cell = document.createElement("td");

            cell.textContent = value;

            row.appendChild(cell);
        });

        // Add the row to the table
        rankingBody.appendChild(row);
    });
}
