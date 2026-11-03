const chapters = document.querySelectorAll(".MC");
const paragraphs = document.querySelectorAll(".MT");
const memoryLink = document.querySelector(".btn");
const memoryHint = document.getElementById("memory_hint");

// Track revealed chapters
let currentChapter = 0;

function revealMemory() {

    // Reveal one chapter per click
    if (currentChapter < chapters.length) {

        chapters[currentChapter].classList.add("visible");
        paragraphs[currentChapter].classList.add("visible");

        // Scroll to the newly revealed chapter
        chapters[currentChapter].scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

        currentChapter++;

    } else if (!memoryLink.classList.contains("visible")) {

        // All chapters revealed, show final link
        memoryLink.classList.add("visible");

        // Hide the hint
        memoryHint.hidden = true;

        // Scroll to the final link
        memoryLink.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }
}

// Reveal memory when clicking anywhere
document.addEventListener("click", (event) => {

    // Allow the final link to work normally
    if (event.target.closest("a")) return;

    revealMemory();
});