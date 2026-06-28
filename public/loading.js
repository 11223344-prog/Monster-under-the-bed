window.onload = function () {

    let percent = 0;

    const bar = document.getElementById("progress");
    const text = document.getElementById("loadingText");

    const timer = setInterval(() => {

        percent++;

        bar.style.width = percent + "%";
        text.innerText = "Loading... " + percent + "%";

        if (percent >= 100) {
            clearInterval(timer);
            window.location.href = "/chapter1.html";
        }

    }, 30);
};