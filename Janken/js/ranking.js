import { getUsers, getCurrentUser } from "./accountStorage.js";
const currentUser = getCurrentUser();
const rankingBody = document.getElementById("ranking_body");

// Rank only players who completed a run
const ranking = getUsers()
    .filter(user => Number.isFinite(user.game?.finalCoins))
    .sort((a, b) =>
        b.game.finalCoins - a.game.finalCoins ||
        b.game.finalMatchesWon - a.game.finalMatchesWon
    );
document.getElementById("ranking_empty").hidden = ranking.length > 0;

ranking.forEach((user, index) => {
    const row = rankingBody.insertRow();
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
        row.insertCell().textContent = value;
    });
});