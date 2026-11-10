
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

    } else if (memoryLink && !memoryLink.classList.contains("visible")) {

        // Memory page: show the navigation link
        memoryLink.classList.add("visible");
        memoryHint.hidden = true;

        memoryLink.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    } else if (!memoryLink) {

        // Good and bad endings: hide the final hint
        memoryHint.hidden = true;
    }
}

document.addEventListener("click", (event) => {

    if (event.target.closest("a")) return;

    revealMemory();
});
