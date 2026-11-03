
const USERS_KEY = "ganken_users";
const ACTIVE_KEY = "ganken_active_user";

// Get registered users from localStorage
export function getUsers() {
    try {
        const users = JSON.parse(
            localStorage.getItem(USERS_KEY) || "[]"
        );

        return Array.isArray(users) ? users : [];
    } catch {
        return [];
    }
}

// Save users in JSON format
function saveUsers(users) {
    localStorage.setItem(
        USERS_KEY,
        JSON.stringify(users)
    );
}

// Convert bytes to hexadecimal text
function toHex(bytes) {
    return Array.from(bytes, byte =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}

// Hash password using PBKDF2 and a unique salt
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
    );

    const saltBytes = new Uint8Array(
        salt.match(/.{2}/g).map(value =>
            parseInt(value, 16)
        )
    );

    const result = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            salt: saltBytes,
            iterations: 100000,
            hash: "SHA-256"
        },
        key,
        256
    );

    return toHex(new Uint8Array(result));
}

// Register a new player
export async function registerUser(details) {
    const users = getUsers();

    const email = details.email.trim().toLowerCase();
    const username = details.username.trim();

    if (users.some(user => user.email === email)) {
        return {
            success: false,
            message: "This email is already registered."
        };
    }

    if (users.some(user =>
        user.username.toLowerCase() === username.toLowerCase()
    )) {
        return {
            success: false,
            message: "This username is already taken."
        };
    }

    const salt = toHex(
        crypto.getRandomValues(new Uint8Array(16))
    );

    const passwordHash = await hashPassword(
        details.password,
        salt
    );

    const newUser = {
        id: crypto.randomUUID(),
        fullName: details.fullName.trim(),
        username: username,
        email: email,
        favoriteSign: details.favorite,
        passwordSalt: salt,
        passwordHash: passwordHash,
        createdAt: new Date().toISOString(),

        game: {
            currentCoins: 0,
            totalCoinsEarned: 0,
            highestLevelCompleted: 0,
            roundsWon: 0,
            matchesWon: 0,
            matchesLost: 0
        }
    };

    users.push(newUser);
    saveUsers(users);

    return {
        success: true,
        message: "Registration successful!"
    };
}

// Authenticate an existing player
export async function loginUser(email, password) {
    const users = getUsers();

    const user = users.find(
        item => item.email === email.trim().toLowerCase()
    );

    if (!user) {
        return {
            success: false,
            message: "Incorrect email or password."
        };
    }

    const enteredHash = await hashPassword(
        password,
        user.passwordSalt
    );

    if (enteredHash !== user.passwordHash) {
        return {
            success: false,
            message: "Incorrect email or password."
        };
    }

    localStorage.setItem(
        ACTIVE_KEY,
        JSON.stringify({ id: user.id })
    );

    return {
        success: true,
        message: "Login successful!"
    };
}

// Get the currently logged-in player
export function getCurrentUser() {
    try {
        const active = JSON.parse(
            localStorage.getItem(ACTIVE_KEY) || "null"
        );

        if (!active) return null;

        return getUsers().find(
            user => user.id === active.id
        ) || null;

    } catch {
        return null;
    }
}

// Log out without deleting the account or progress
export function logoutUser() {
    localStorage.removeItem(ACTIVE_KEY);
}
