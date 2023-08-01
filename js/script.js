const imgBoxes = document.querySelectorAll(".img-box");
const fullscreenOverlay = document.getElementById("fullscreen-overlay");
const fullscreenImage = document.getElementById("fullscreen-image");

function openFullscreen(imageSrc) {
    fullscreenImage.src = imageSrc;
    fullscreenOverlay.style.display = "block";
}

function closeFullscreen() {
    fullscreenOverlay.style.display = "none";
}

// Add click event listener to each image box
imgBoxes.forEach((box) => {
    box.addEventListener("click", () => {
        const image = box.querySelector("img");
        const imageSrc = image.getAttribute("src");
        openFullscreen(imageSrc);
    });
});