
import { getUsers, getCurrentUser } from "./accountStorage.js";

const users = getUsers();
const currentUser = getCurrentUser();

const rankingBody = document.getElementById("ranking_body");
const emptyMessage = document.getElementById("ranking_empty");

// Only players who finished a game appear
const ranking = users
    .filter(user => Number.isFinite(user.game?.finalCoins))
    .sort((a, b) => {
        const coinDifference = b.game.finalCoins - a.game.finalCoins;
        if (coinDifference !== 0) return coinDifference;
        return b.game.finalMatchesWon - a.game.finalMatchesWon;
    });

if (ranking.length === 0) {
    emptyMessage.hidden = false;
} else {
    emptyMessage.hidden = true;

    ranking.forEach((user, index) => {
        const row = document.createElement("tr");

        if (currentUser && user.id === currentUser.id) {
            row.classList.add("current_player");
        }

        const playerData = [
            index + 1,
            user.username,
            user.game.finalCoins,
            user.game.finalMatchesWon,
            user.game.finalHighestLevelCompleted
        ];

        playerData.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        rankingBody.appendChild(row);
    });
}
