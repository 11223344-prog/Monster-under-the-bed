const express = require("express");

const app = express();

// Middleware
app.use(express.static("public"));
app.use(express.json());

// Home Route
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

// Game API
app.get("/api/game", (req, res) => {
    res.json({
        title: "Monster Under The Bed",
        chapter: 1,
        status: "Loading..."
    });
});

// Save Player API
app.post("/save-player", (req, res) => {

    const playerName = req.body.name;

    console.log("Player Name:", playerName);

    res.json({
        success: true,
        message: "Player saved successfully!"
    });

});

// Start Server
const PORT = 3000;

app.listen(PORT, () => {

    console.log(`Server is running at http://localhost:${PORT}`);

});
