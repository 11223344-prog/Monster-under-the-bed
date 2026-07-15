/* ═══════════════════════════════════════════════════════════════
   Monster Under The Bed — Chapter 1: The First Night
   Full gameplay: movement, flashlight, hiding, monster AI,
   health/battery, diary pages, pause, backend save/load
   ═══════════════════════════════════════════════════════════════ */

// ── DOM refs ──────────────────────────────────────────────────────────────────
const roomEl      = document.getElementById('room');
const playerEl    = document.getElementById('player');
const monsterEl   = document.getElementById('monster');
const bedEl       = document.getElementById('bed');
const closetEl    = document.getElementById('closet');
const flashlightEl= document.getElementById('flashlight-cone');
const stageEl     = document.getElementById('stage');
const messageEl   = document.getElementById('message');
const roomNameEl  = document.getElementById('room-name');
const pagesEl     = document.getElementById('pages');
const timerEl     = document.getElementById('timer');
const healthBarEl = document.getElementById('health-bar');
const healthValEl = document.getElementById('health-val');
const battBarEl   = document.getElementById('battery-bar');
const battValEl   = document.getElementById('battery-val');
const pauseEl     = document.getElementById('pause-overlay');
const pauseStats  = document.getElementById('pause-stats');

// ── Zones (% of stage width) ──────────────────────────────────────────────────
const ZONES = [
  { key:'hallway', name:'Hallway',           from:0,  to:20 },
  { key:'living',  name:'Living Room',       from:20, to:40 },
  { key:'bedroom', name:'The Bedroom',       from:40, to:62 },
  { key:'study',   name:'Study',             from:62, to:82 },
  { key:'exit',    name:'Front Door — Exit', from:82, to:100 },
];

// ── Diary page state ──────────────────────────────────────────────────────────
const DIARY_PAGES = [
  { id:'dp1', x:22, collected:false },
  { id:'dp2', x:55, collected:false },
  { id:'dp3', x:76, collected:false },
];
const TOTAL_PAGES = 8; // across all chapters

// ── Game state ────────────────────────────────────────────────────────────────
let playerX      = 5;
let monsterX     = 50;
let health       = 100;
let battery      = 100;
let pagesFound   = 0;
let seconds      = 0;
let flashlightOn = false;
let isHiding     = false;
let isPaused     = false;
let gameOver     = false;

// Monster AI state
const MS = { PATROL:0, ALERT:1, HUNT:2, STUNNED:3 };
let monsterState  = MS.PATROL;
let monsterDir    = 1;      // patrol direction
let alertTimer    = 0;
let stunnedTimer  = 0;
let bedScareDone  = false;
let monsterActive = false;  // hidden until bed scare

const PLAYER_SPEED        = 1.6;
const MONSTER_PATROL_SPD  = 0.5;
const MONSTER_ALERT_SPD   = 0.8;
const MONSTER_HUNT_SPD    = 1.4;
const CATCH_DIST          = 6;
const VISION_RANGE        = 30;  // % of stage
const BED_CENTER          = 52;
const EXIT_X              = 88;

// Input
const keys = { left:false, right:false };

// ── Sound ──────────────────────────────────────────────────────────────────
let _stepTimer = 0;
let _wasHunted = false;
Sound.unlock();
Sound.startDrone();

// ── Restore save if continuing ────────────────────────────────────────────────
(function restoreIfContinue() {
  const saved = localStorage.getItem('mutb_resume');
  if (saved) {
    try {
      const d = JSON.parse(saved);
      health  = d.health  ?? 100;
      battery = d.battery ?? 100;
      pagesFound = d.diaryPages ?? 0;
      pagesEl.textContent = pagesFound;
    } catch(e) {}
    localStorage.removeItem('mutb_resume');
  }
})();

// ── Input listeners ───────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a') keys.left  = true;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
  if (e.key === 'f' || e.key === 'F')  handleF();
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
  if (e.key === 'ArrowUp' || e.key === ' ') tryInteract();
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft'  || e.key === 'a') keys.left  = false;
  if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
});

closetEl.addEventListener('click', () => handleF());

// ── F key: flashlight or hide ─────────────────────────────────────────────────
function handleF() {
  if (gameOver || isPaused) return;
  // If near closet, hide
  if (Math.abs(playerX - 14) < 8) {
    toggleHide();
  } else {
    toggleFlashlight();
  }
}

function toggleFlashlight() {
  if (battery <= 0) { showMsg('Battery dead!', 1800); return; }
  flashlightOn = !flashlightOn;
  Sound.flashlightClick(flashlightOn);
  if (flashlightOn) Sound.startFlashlightHum(); else Sound.stopFlashlightHum();
  updateFlashlight();
}

function toggleHide() {
  Sound.uiClick();
  if (isHiding) {
    isHiding = false;
    playerEl.style.opacity = '1';
    closetEl.classList.remove('active-hide');
    showMsg('You step out of the closet.', 1500);
  } else {
    isHiding = true;
    playerEl.style.opacity = '0';
    closetEl.classList.add('active-hide');
    showMsg('You hide in the closet. Hold still.', 2200);
    // If monster was hunting, lose track
    if (monsterState === MS.HUNT) monsterState = MS.PATROL;
  }
}

function updateFlashlight() {
  const pct = (playerX / 100) * 820; // pixels
  flashlightEl.style.setProperty('--fx', pct + 'px');
  flashlightEl.style.setProperty('--fy', '75%');
  flashlightEl.className = flashlightOn ? 'flashlight-on' : 'flashlight-off';
}

// ── Interact (pick up diary pages) ───────────────────────────────────────────
function tryInteract() {
  if (gameOver || isPaused) return;
  DIARY_PAGES.forEach(dp => {
    if (!dp.collected && Math.abs(playerX - dp.x) < 5) {
      dp.collected = true;
      pagesFound = Math.min(TOTAL_PAGES, pagesFound + 1);
      document.getElementById(dp.id).style.display = 'none';
      pagesEl.textContent = pagesFound;
      Sound.pageCollect();
      showMsg('📄 Diary page collected! (' + pagesFound + '/8)');
    }
  });
}

// ── Zone helpers ──────────────────────────────────────────────────────────────
function getZone(x) {
  return ZONES.find(z => x >= z.from && x < z.to) || ZONES[ZONES.length - 1];
}
function updateRoom() {
  const z = getZone(playerX);
  roomNameEl.textContent = z.name;
  roomEl.className = 'room zone-' + z.key;
  if (monsterState === MS.HUNT) roomEl.classList.add('alarm');
}

// ── Monster AI ────────────────────────────────────────────────────────────────
function tickMonster() {
  if (!monsterActive) return;

  const dist = Math.abs(monsterX - playerX);
  const canSee = dist < VISION_RANGE && !isHiding;

  // Flashlight stun
  if (flashlightOn && canSee && monsterState !== MS.STUNNED) {
    monsterState  = MS.STUNNED;
    stunnedTimer  = 80; // ticks
    monsterEl.classList.add('stunned');
    Sound.monsterStunned();
    showMsg('The flashlight repels it!', 1500);
    return;
  }

  switch (monsterState) {
    case MS.PATROL:
      monsterX += monsterDir * MONSTER_PATROL_SPD;
      if (monsterX > 80 || monsterX < 20) monsterDir *= -1;
      if (canSee) { monsterState = MS.ALERT; alertTimer = 60; Sound.monsterAlert(); showMsg('👁 It sees you!', 1800); }
      break;
    case MS.ALERT:
      alertTimer--;
      if (alertTimer <= 0) monsterState = MS.HUNT;
      break;
    case MS.HUNT:
      const step = MONSTER_HUNT_SPD;
      monsterX += (playerX > monsterX ? step : -step);
      if (dist < CATCH_DIST && !isHiding) { caught(); return; }
      if (isHiding) monsterState = MS.PATROL;
      break;
    case MS.STUNNED:
      stunnedTimer--;
      if (stunnedTimer <= 0) {
        monsterState = MS.PATROL;
        monsterEl.classList.remove('stunned');
      }
      break;
  }
  monsterX = Math.max(5, Math.min(95, monsterX));
  monsterEl.style.left = monsterX + '%';
}

// ── Bed scare ─────────────────────────────────────────────────────────────────
function checkBedScare() {
  if (bedScareDone || gameOver) return;
  if (Math.abs(playerX - BED_CENTER) < 7) {
    bedScareDone = true;
    bedEl.classList.add('shaking');
    showMsg('Something is moving under the bed…', 1600);
    setTimeout(() => {
      if (gameOver) return;
      bedEl.classList.remove('shaking');
      monsterActive = true;
      monsterEl.classList.add('active');
      monsterX = BED_CENTER;
      monsterEl.style.left = monsterX + '%';
      monsterState = MS.HUNT;
      Sound.jumpscare();
      showMsg('👹 IT CRAWLS OUT — RUN!', 3000);
    }, 1400);
  }
}

// ── Battery drain ─────────────────────────────────────────────────────────────
function tickBattery() {
  if (flashlightOn) {
    battery = Math.max(0, battery - 0.15);
    if (battery <= 0) { flashlightOn = false; Sound.stopFlashlightHum(); Sound.batteryDead(); updateFlashlight(); showMsg('🔦 Battery dead!', 2000); }
    battBarEl.style.width = battery + '%';
    battValEl.textContent = Math.round(battery);
  }
}

// ── Health (passive drain while hunted) ──────────────────────────────────────
function tickHealth() {
  if (monsterState === MS.HUNT && !isHiding && monsterActive) {
    const dist = Math.abs(monsterX - playerX);
    if (dist < 20) {
      health = Math.max(0, health - 0.05);
      healthBarEl.style.background = health < 30 ? '#ff0000' : '#8a0000';
      healthBarEl.style.width = health + '%';
      healthValEl.textContent = Math.round(health);
      if (health <= 0) caught();
    }
  }
}

// ── Auto-collect nearby pages on proximity ───────────────────────────────────
function checkPagePickup() {
  DIARY_PAGES.forEach(dp => {
    if (!dp.collected && Math.abs(playerX - dp.x) < 3) {
      dp.collected = true;
      pagesFound = Math.min(TOTAL_PAGES, pagesFound + 1);
      document.getElementById(dp.id).style.display = 'none';
      pagesEl.textContent = pagesFound;
      showMsg('📄 Diary page collected! (' + pagesFound + '/8)');
    }
  });
}

// ── Main game loop ─────────────────────────────────────────────────────────────
const loopHandle = setInterval(() => {
  if (gameOver || isPaused) return;

  // Move player
  if (keys.left  && !isHiding) playerX -= PLAYER_SPEED;
  if (keys.right && !isHiding) playerX += PLAYER_SPEED;
  playerX = Math.max(1, Math.min(99, playerX));

  checkBedScare();
  checkPagePickup();
  tickMonster();
  tickBattery();
  tickHealth();
  updateRoom();
  updateFlashlight();

  // Footstep sound while actually moving
  if ((keys.left || keys.right) && !isHiding) {
    _stepTimer -= 30;
    if (_stepTimer <= 0) { Sound.footstep(); _stepTimer = 260; }
  }

  // Heartbeat while being actively hunted, or health is low
  const beingHunted = monsterState === MS.HUNT && !isHiding && monsterActive;
  const lowHealth = health < 30;
  if ((beingHunted || lowHealth) && !_wasHunted) {
    Sound.startHeartbeat(lowHealth ? 140 : 110);
    _wasHunted = true;
  } else if (!beingHunted && !lowHealth && _wasHunted) {
    Sound.stopHeartbeat();
    _wasHunted = false;
  }

  playerEl.style.left = playerX + '%';
  // Flip player sprite
  playerEl.style.transform = keys.left ? 'scaleX(-1)' : 'scaleX(1)';

  // Exit check
  if (playerX >= EXIT_X) { escaped(); return; }
}, 30);

// ── Timer ──────────────────────────────────────────────────────────────────────
const timerHandle = setInterval(() => {
  if (gameOver || isPaused) return;
  seconds++;
  timerEl.textContent = seconds;
  // Auto-save every 30 seconds
  if (seconds % 30 === 0 && API.isLoggedIn()) {
    API.save({ chapter:1, progress: Math.round(playerX), diaryPages: pagesFound, health: Math.round(health), battery: Math.round(battery) });
  }
}, 1000);

// ── Pause ──────────────────────────────────────────────────────────────────────
function togglePause() {
  if (gameOver) return;
  isPaused = !isPaused;
  Sound.uiClick();
  pauseEl.classList.toggle('hidden', !isPaused);
  if (isPaused) {
    pauseStats.innerHTML = `Health: <b>${Math.round(health)}</b> &nbsp; Battery: <b>${Math.round(battery)}</b><br>Diary pages: <b>${pagesFound}/8</b> &nbsp; Time: <b>${seconds}s</b>`;
  }
}

async function saveAndMenu() {
  if (API.isLoggedIn()) {
    await API.save({ chapter:1, progress: Math.round(playerX), diaryPages: pagesFound, health: Math.round(health), battery: Math.round(battery) });
  }
  window.location.href = 'index.html';
}

// ── End states ────────────────────────────────────────────────────────────────
async function caught() {
  if (gameOver) return;
  gameOver = true;
  Sound.stopHeartbeat();
  Sound.stopFlashlightHum();
  Sound.stopDrone();
  Sound.caughtSting();
  clearInterval(loopHandle);
  clearInterval(timerHandle);
  localStorage.setItem('mutb_pages',  pagesFound);
  localStorage.setItem('mutb_time',   seconds);
  localStorage.setItem('mutb_health', Math.round(health));
  localStorage.setItem('mutb_battery', Math.round(battery));
  if (API.isLoggedIn()) {
    const result = await API.caught({ pages: pagesFound, time: seconds, health: Math.round(health), battery: Math.round(battery) });
    if (result.user) localStorage.setItem('mutb_user', JSON.stringify(result.user));
    if (result.newAchievements?.length) localStorage.setItem('mutb_new_ach', JSON.stringify(result.newAchievements));
  }
  setTimeout(() => window.location.href = 'caught.html', 600);
}

async function escaped() {
  if (gameOver) return;
  gameOver = true;
  Sound.stopHeartbeat();
  Sound.stopFlashlightHum();
  Sound.stopDrone();
  Sound.victoryFanfare();
  clearInterval(loopHandle);
  clearInterval(timerHandle);
  localStorage.setItem('mutb_pages',   pagesFound);
  localStorage.setItem('mutb_time',    seconds);
  localStorage.setItem('mutb_health',  Math.round(health));
  localStorage.setItem('mutb_battery', Math.round(battery));
  if (API.isLoggedIn()) {
    // Save progress for next chapter
    await API.save({ chapter:2, progress:0, diaryPages: pagesFound, health: Math.round(health), battery: Math.round(battery) });
    // Submit run to gamification system
    const result = await API.escaped({ pages: pagesFound, time: seconds, health: Math.round(health), battery: Math.round(battery) });
    if (result.score)            localStorage.setItem('mutb_score',   result.score);
    if (result.xpEarned)         localStorage.setItem('mutb_xp',      result.xpEarned);
    if (result.leveled)          localStorage.setItem('mutb_leveled', '1');
    if (result.user)             localStorage.setItem('mutb_user',    JSON.stringify(result.user));
    if (result.newAchievements?.length) localStorage.setItem('mutb_new_ach', JSON.stringify(result.newAchievements));
  } else {
    // Guest score calc
    const score = Math.max(0, pagesFound*500 + Math.round(health*8) + Math.round(battery*3) + Math.max(0,3000-seconds*4));
    localStorage.setItem('mutb_score', score);
  }
  setTimeout(() => window.location.href = 'survive.html', 500);
}

// ── Message helper ────────────────────────────────────────────────────────────
let _msgTimer;
function showMsg(text, ms=2400) {
  messageEl.textContent = text;
  clearTimeout(_msgTimer);
  if (ms) _msgTimer = setTimeout(() => { if (messageEl.textContent===text) messageEl.textContent=''; }, ms);
}


// ── Live score (display only) ──────────────────────────────────────────────────
function calcLiveScore() {
  return Math.max(0, pagesFound*500 + Math.round(health*8) + Math.round(battery*3) + Math.max(0,3000-seconds*4));
}

// ── Init ──────────────────────────────────────────────────────────────────────
playerEl.style.left = playerX + '%';
monsterEl.style.left = monsterX + '%';
updateRoom();
showMsg('Find a way out — but stay quiet near the bedroom.', 3000);
