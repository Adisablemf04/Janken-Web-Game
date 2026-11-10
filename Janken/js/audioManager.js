const music = new Audio();
music.loop = true;
music.volume = 0.3;
music.preload = "auto";
let currentTrack = "";

function startMusic() {
    if (currentTrack && music.paused) {
        music.play().catch(() => {
            // Browser may require a click or keypress first.
        });
    }
}

export function playMusic(filename) {
    if (currentTrack === filename) {
        startMusic();
        return;
    }
    currentTrack = filename;
    music.pause();
    music.src = new URL(`../audio/${filename}`, import.meta.url).href;
    music.load();
    startMusic();
}

// Start audio on the first interaction if autoplay is blocked.
window.addEventListener("pointerdown", startMusic);
window.addEventListener("keydown", startMusic);