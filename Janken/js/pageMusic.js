const page = window.location.pathname.split("/").pop().toLowerCase();
const isNavigation = [
    "navigation.html", "login.html", "registration.html", "ranking.html"
].includes(page);

const isMemory = [
    "memory.html", "goodending.html", "badending.html"
].includes(page);

const filename = isNavigation ? "navigation.mp3"
    : isMemory ? "whispering memories.mp3" : null;

if (filename) {
    const music = new Audio(new URL(`../audio/${filename}`, import.meta.url).href);
    const storageKey = "ganken_navigation_music_position";
    music.loop = true;
    music.volume = 0.3;
    function playMusic() {
        if (music.paused) music.play().catch(() => {});
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
    window.addEventListener("pagehide", () => {
        if (isNavigation && Number.isFinite(music.currentTime)) {
            sessionStorage.setItem(storageKey, String(music.currentTime));
        }
    });
    document.addEventListener("pointerdown", playMusic);
    document.addEventListener("keydown", playMusic);
}