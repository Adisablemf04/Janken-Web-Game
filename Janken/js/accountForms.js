import { registerUser, loginUser } from "./accountStorage.js";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function showMessage(element, message, type = "error") {
    element.textContent = message;
    element.dataset.type = type;
}

// REGISTRATION
const registerForm = document.getElementById("register_form");
if (registerForm) {
    const message = document.getElementById("register_message");
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const details = {
            fullName: document.getElementById("full_name").value.trim(),
            username: document.getElementById("username").value.trim(),
            email: document.getElementById("email").value.trim(),
            password: document.getElementById("password").value
        };
        const confirmPassword = document.getElementById("confirm_password").value;
        if (details.fullName.length < 2) {
            return showMessage(message, "Enter a valid full name.");
        }
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(details.username)) {
            return showMessage(message, "Username must be 3-16 characters: letters, numbers or underscores.");
        }
        if (!emailPattern.test(details.email)) {
            return showMessage(message, "Enter a valid email address.");
        }
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(details.password)) {
            return showMessage(message, "Password must contain at least 8 characters, including a letter and number.");
        }
        if (details.password !== confirmPassword) {
            return showMessage(message, "Passwords do not match.");
        }
        const button = registerForm.querySelector("button");
        button.disabled = true;
        try {
            const result = await registerUser(details);
            if (!result.success) {
                return showMessage(message, result.message);
            }
            window.location.href = "login.html?registered=1";
        } catch {
            showMessage(message, "Registration failed. Open the website using a local development server.");
        } finally {
            button.disabled = false;
        }
    });
}

// LOGIN
const loginForm = document.getElementById("login_form");
if (loginForm) {
    const message = document.getElementById("login_message");
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") === "1") {
        showMessage(message, "Registration successful. Please log in.", "success");
    }
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;
        if (!email || !password) {
            return showMessage(message, "Please enter your email and password.");
        }
        if (!emailPattern.test(email)) {
            return showMessage(message, "Enter a valid email address.");
        }
        const button = loginForm.querySelector("button");
        button.disabled = true;
        try {
            const result = await loginUser(email, password);
            if (!result.success) {
                return showMessage(message, result.message);
            }
            window.location.href = "navigation.html";
        } catch {
            showMessage(message, "Login failed. Open the website using a local development server.");
        } finally {
            button.disabled = false;
        }
    });
}