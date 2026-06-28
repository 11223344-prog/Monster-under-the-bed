console.log("Script Loaded");

window.onload = function () {

    const progress = document.getElementById("progress");
    const loadingText = document.getElementById("loadingText");

    let percent = 0;

    const timer = setInterval(() => {

        percent++;

        progress.style.width = percent + "%";
        loadingText.textContent = "Loading... " + percent + "%";

        if (percent >= 100) {

            clearInterval(timer);

            fetch("/save-player", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: "Player"
                })
            })
            .then(res => res.json())
            .then(() => {

                setTimeout(() => {
                    window.location.href = "/chapter1.html";
                }, 800);

            })
            .catch(err => {
                console.error("Save error:", err);
            });

        }

    }, 50);
};