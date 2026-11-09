
const page = window.location.pathname.split("/").pop().toLowerCase();

const navigationPages = [
    "navigation.html",
    "login.html",
    "registration.html",
    "ranking.html"
];

const memoryPages = [
    "memory.html",
    "goodending.html",
    "badending.html"
];

const isNavigation = navigationPages.includes(page);

const filename = isNavigation
    ? "navigation.mp3"
    : memoryPages.includes(page)
        ? "whispering memories.mp3"
        : null;

if (filename) {
    const music = new Audio(new URL(`../audio/${filename}`, import.meta.url).href);

    music.loop = true;
    music.volume = 0.3;
    music.preload = "auto";

    const storageKey = "ganken_navigation_music_position";

    function playMusic() {
        if (music.paused) {
            music.play().catch(() => {
                // Playback may require user interaction.
            });
        }
    }

    function savePosition() {
        if (isNavigation && Number.isFinite(music.currentTime)) {
            sessionStorage.setItem(storageKey, String(music.currentTime));
        }
    }

    music.addEventListener("loadedmetadata", () => {
        if (isNavigation && music.duration) {
            const savedTime = Number(sessionStorage.getItem(storageKey) || 0);

            if (Number.isFinite(savedTime)) {
                music.currentTime = savedTime % music.duration;
            }
        }

        playMusic();
    }, { once: true });

    music.addEventListener("timeupdate", savePosition);
    window.addEventListener("pagehide", savePosition);

    document.addEventListener("pointerdown", playMusic);
    document.addEventListener("keydown", playMusic);
}
