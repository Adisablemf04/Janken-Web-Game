const chapters = document.querySelectorAll(".MC");
const paragraphs = document.querySelectorAll(".MT");
const memoryLink = document.querySelector(".btn");
const memoryHint = document.getElementById("memory_hint");
let currentChapter = 0;

function revealMemory() {
    if (currentChapter < chapters.length) {
        chapters[currentChapter].classList.add("visible");
        paragraphs[currentChapter].classList.add("visible");
        chapters[currentChapter].scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
        currentChapter++;
    } else if (!memoryLink.classList.contains("visible")) {
        memoryLink.classList.add("visible");
        memoryHint.hidden = true;
        memoryLink.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }
}
document.addEventListener("click", (event) => {
    if (event.target.closest("a")) return;
    revealMemory();
});