// Check backend connection when page loads
fetch("/api/game")
    .then(response => response.json())
    .then(data => {
        console.log("✅ Connected to Backend!");
        console.log(data);
    })
    .catch(error => {
        console.error("❌ Backend Connection Error:", error);
    });

console.log("Script Loaded");

// Get HTML elements
const progress = document.getElementById("progress");
const loadingText = document.getElementById("loadingText");

// Start from 0%
let percent = 0;

// Increase every 50 milliseconds
const timer = setInterval(function () {

    percent++;

    // Update loading bar
    progress.style.width = percent + "%";

    // Update loading text
    loadingText.textContent = "Loading... " + percent + "%";

    // Stop at 100%
    if (percent >= 100) {

        clearInterval(timer);

        // Send data to backend
        fetch("/save-player", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: "Player"
            })
        })
        .then(response => response.json())
        .then(data => {

            console.log("✅ Backend Response:", data);

            // Go to Chapter 1 after 1 second
            setTimeout(() => {
                window.location.href = "chapter1.html";
            }, 1000);

        })
        .catch(error => {
            console.error("❌ Error saving player:", error);
        });

    }

}, 50);