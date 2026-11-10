import {
    getCurrentUser, logoutUser
} from "./accountStorage.js";

const currentUser = getCurrentUser();
const registrationLink = document.getElementById("registration_link");
const loginLink = document.getElementById("login_link");
const playerName = document.getElementById("player_name");
const logoutButton = document.getElementById("logout_button");

// Check whether a player is logged in
if (currentUser) {
    registrationLink.hidden = true;
    loginLink.hidden = true;
    playerName.textContent = currentUser.username;
    playerName.hidden = false;
    logoutButton.hidden = false;
}

// Log the player out
logoutButton.addEventListener("click", () => {
    logoutUser();
    window.location.href = "navigation.html";
});