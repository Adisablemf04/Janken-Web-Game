const chapters = document.querySelectorAll(".MC");
const paragraphs = document.querySelectorAll(".MT");
const memoryLink = document.querySelector(".btn");
const memoryHint = document.getElementById("memory_hint");
let currentChapter = 0;
function revealMemory() {
    let target = null;
    if (currentChapter < chapters.length) {
        target = chapters[currentChapter];
        target.classList.add("visible");
        paragraphs[currentChapter].classList.add("visible");
        currentChapter++;
    } else if (memoryLink && !memoryLink.classList.contains("visible")) {
        target = memoryLink;
        memoryLink.classList.add("visible");
        memoryHint.hidden = true;
    } else if (!memoryLink) {
        memoryHint.hidden = true;
    }
    target?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

document.addEventListener("click", event => {
    if (!event.target.closest("a")) revealMemory();
});