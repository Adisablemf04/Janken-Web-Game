
import {
    registerUser,
    loginUser
} from "./accountStorage.js";

// Display feedback inside the form
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
            favorite: document.getElementById("favorite").value,
            password: document.getElementById("password").value
        };

        const confirmPassword =
            document.getElementById("confirm_password").value;

        // Validate full name
        if (details.fullName.length < 2) {
            showMessage(message, "Enter a valid full name.");
            return;
        }

        // Validate username
        if (!/^[a-zA-Z0-9_]{3,16}$/.test(details.username)) {
            showMessage(
                message,
                "Username must be 3-16 characters: letters, numbers or underscores."
            );
            return;
        }

        // Validate email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
            showMessage(message, "Enter a valid email address.");
            return;
        }

        // Validate favourite sign
        if (!["Rock", "Paper", "Scissors"].includes(details.favorite)) {
            showMessage(message, "Choose your favourite RPS sign.");
            return;
        }

        // Validate password
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(details.password)) {
            showMessage(
                message,
                "Password must contain at least 8 characters, including a letter and number."
            );
            return;
        }

        // Confirm password
        if (details.password !== confirmPassword) {
            showMessage(message, "Passwords do not match.");
            return;
        }

        // Disable submit while saving
        const button = registerForm.querySelector("button");
        button.disabled = true;

        try {
            const result = await registerUser(details);

            if (!result.success) {
                showMessage(message, result.message);
                return;
            }

            window.location.href = "login.html?registered=1";

        } catch {
            showMessage(
                message,
                "Registration failed. Open the website using a local development server."
            );
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
        showMessage(
            message,
            "Registration successful. Please log in.",
            "success"
        );
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        // Check empty fields
        if (!email || !password) {
            showMessage(message, "Please enter your email and password.");
            return;
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage(message, "Enter a valid email address.");
            return;
        }

        const button = loginForm.querySelector("button");
        button.disabled = true;

        try {
            const result = await loginUser(email, password);

            if (!result.success) {
                showMessage(message, result.message);
                return;
            }

            window.location.href = "navigation.html";

        } catch {
            showMessage(
                message,
                "Login failed. Open the website using a local development server."
            );
        } finally {
            button.disabled = false;
        }
    });
}
