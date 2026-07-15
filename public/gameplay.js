const player = document.getElementById("player");
const monster = document.getElementById("monster");

let playerX = 100;
let monsterX = window.innerWidth * 0.8;

// Set initial positions
player.style.left = playerX + "px";
monster.style.left = monsterX + "px";

const speed = 10;

// 🎮 PLAYER MOVEMENT
document.addEventListener("keydown", (e) => {

    if (e.key === "ArrowRight") playerX += speed;
    if (e.key === "ArrowLeft") playerX -= speed;

    // boundaries
    if (playerX < 0) playerX = 0;
    if (playerX > window.innerWidth - 80)
        playerX = window.innerWidth - 80;

    player.style.left = playerX + "px";
});

// 👹 MONSTER CHASE
setInterval(() => {

    if (monsterX > playerX) {
        monsterX -= 2;
    } else {
        monsterX += 2;
    }

    monster.style.left = monsterX + "px";

    // 💀 COLLISION
    if (Math.abs(monsterX - playerX) < 40) {
        alert("💀 Monster caught you!");
        location.reload();
    }

}, 50);