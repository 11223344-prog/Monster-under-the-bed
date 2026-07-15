require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mutb_secret_key_2024';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── In-memory store ──────────────────────────────────────────────────────────
// username → { id, username, passwordHash, xp, level, achievements[], stats{} }
const users    = new Map();
// userId → save record
const saves    = new Map();
// userId → settings
const settings = new Map();
// [{ rank, username, score, pages, time, date }]
const leaderboard = [];
let nextId = 1;

// ─── XP / levelling ──────────────────────────────────────────────────────────
function xpToNextLevel(level) { return level * level * 100; }

function addXP(user, amount) {
  user.xp += amount;
  let leveled = false;
  while (user.xp >= xpToNextLevel(user.level)) {
    user.xp -= xpToNextLevel(user.level);
    user.level++;
    leveled = true;
  }
  return leveled;
}

// ─── Achievement definitions ──────────────────────────────────────────────────
const ACHIEVEMENT_DEFS = [
  { id: 'first_run',     icon: '🎮', title: 'First Steps',    desc: 'Complete your first run',              xp: 100 },
  { id: 'survivor',      icon: '🚪', title: 'Survivor',       desc: 'Escape the house alive',               xp: 300 },
  { id: 'page_hunter',   icon: '📄', title: 'Page Hunter',    desc: 'Collect 5+ diary pages in one run',    xp: 250 },
  { id: 'lore_master',   icon: '📖', title: 'Lore Master',    desc: 'Collect all 8 diary pages in one run', xp: 600 },
  { id: 'speed_runner',  icon: '⚡', title: 'Speed Runner',   desc: 'Escape in under 60 seconds',           xp: 400 },
  { id: 'ghost',         icon: '👻', title: 'Ghost',          desc: 'Escape without being caught once',     xp: 500 },
  { id: 'battery_saver', icon: '🔋', title: 'Battery Saver',  desc: 'Escape with 75%+ battery remaining',   xp: 300 },
  { id: 'fearless',      icon: '🦁', title: 'Fearless',       desc: 'Escape with 90%+ health remaining',    xp: 400 },
  { id: 'monster_food',  icon: '💀', title: 'Monster Food',   desc: 'Get caught 5 times total',             xp: 100 },
  { id: 'veteran',       icon: '⚔️',  title: 'Veteran',        desc: 'Complete 10 total runs',               xp: 500 },
  { id: 'high_scorer',   icon: '🏆', title: 'High Scorer',    desc: 'Reach a score of 5000+',               xp: 400 },
  { id: 'level_5',       icon: '⭐', title: 'Rising Dark',    desc: 'Reach Level 5',                        xp: 0   },
];

function checkAchievements(user, runData) {
  const s    = user.stats;
  const newlyEarned = [];

  const conds = {
    first_run:     s.totalRuns >= 1,
    survivor:      s.totalEscapes >= 1,
    page_hunter:   (runData.pages || 0) >= 5,
    lore_master:   (runData.pages || 0) >= 8,
    speed_runner:  runData.escaped && (runData.time || 999) <= 60,
    ghost:         runData.escaped && !runData.wasCaught,
    battery_saver: runData.escaped && (runData.battery || 0) >= 75,
    fearless:      runData.escaped && (runData.health || 0) >= 90,
    monster_food:  s.totalCaught >= 5,
    veteran:       s.totalRuns >= 10,
    high_scorer:   s.highScore >= 5000,
    level_5:       user.level >= 5,
  };

  for (const [id, met] of Object.entries(conds)) {
    if (met && !user.achievements.includes(id)) {
      user.achievements.push(id);
      const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
      if (def && def.xp > 0) addXP(user, def.xp);
      newlyEarned.push(id);
    }
  }
  return newlyEarned;
}

// ─── Score formula ────────────────────────────────────────────────────────────
function calcScore({ pages = 0, time = 0, health = 100, battery = 100 }) {
  return Math.max(0, Math.round(
    pages   * 500 +
    health  * 8   +
    battery * 3   +
    Math.max(0, 3000 - time * 4)
  ));
}

// ─── Public user shape ────────────────────────────────────────────────────────
function publicUser(user) {
  return {
    id: user.id, username: user.username,
    xp: user.xp, level: user.level,
    xpToNext: xpToNextLevel(user.level),
    achievements: user.achievements,
    stats: user.stats,
  };
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function genToken(user) {
  return jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}
function verifyToken(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid or expired token' }); }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
app.post('/api/game/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)  return res.status(400).json({ error: 'Username and password required' });
  if (password.length < 6)     return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (users.has(username))     return res.status(400).json({ error: 'Username already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: nextId++, username, passwordHash,
    xp: 0, level: 1, achievements: [],
    stats: { totalRuns: 0, totalEscapes: 0, totalCaught: 0, highScore: 0, bestTime: null, totalPages: 0 },
  };
  users.set(username, user);
  settings.set(user.id, { sound: true, music: true, difficulty: 'normal' });
  res.status(201).json({ message: 'Registered', user: publicUser(user), token: genToken(user) });
});

app.post('/api/game/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  const user = users.get(username);
  if (!user) return res.status(401).json({ error: 'User not found' });
  if (!await bcrypt.compare(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid password' });
  const save = saves.get(user.id) || null;
  res.json({ message: 'Login successful', user: publicUser(user), token: genToken(user), hasSave: !!save, save });
});

// ─── SAVE / LOAD ──────────────────────────────────────────────────────────────
app.post('/api/game/save', verifyToken, (req, res) => {
  const { chapter, progress, diaryPages, health, battery } = req.body;
  const record = { chapter: chapter || 1, progress: progress || 0, diaryPages: diaryPages || 0,
                   health: health || 100, battery: battery || 100, timestamp: new Date().toISOString() };
  saves.set(req.user.userId, record);
  res.json({ message: 'Saved', data: record });
});

app.get('/api/game/load', verifyToken, (req, res) => {
  const save = saves.get(req.user.userId);
  if (!save) return res.status(404).json({ error: 'No saved game' });
  res.json({ message: 'Loaded', data: save });
});

app.delete('/api/game/delete', verifyToken, (req, res) => {
  saves.delete(req.user.userId);
  res.json({ message: 'Save deleted' });
});

app.post('/api/game/restart', verifyToken, (req, res) => {
  const record = { chapter: 1, progress: 0, diaryPages: 0, health: 100, battery: 100, timestamp: new Date().toISOString() };
  saves.set(req.user.userId, record);
  res.json({ message: 'Restarted', data: record });
});

// ─── RUN OUTCOMES (gamification) ─────────────────────────────────────────────
app.post('/api/game/caught', verifyToken, (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.stats.totalRuns++;
  user.stats.totalCaught++;
  addXP(user, 50); // consolation XP
  const newAchievements = checkAchievements(user, { escaped: false, wasCaught: true, ...req.body });

  res.json({ message: 'Caught recorded', user: publicUser(user), newAchievements });
});

app.post('/api/game/escaped', verifyToken, (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { pages = 0, time = 0, health = 100, battery = 100 } = req.body;
  const score = calcScore({ pages, time, health, battery });

  // Update stats
  user.stats.totalRuns++;
  user.stats.totalEscapes++;
  user.stats.totalPages += pages;
  if (score > user.stats.highScore) user.stats.highScore = score;
  if (!user.stats.bestTime || time < user.stats.bestTime) user.stats.bestTime = time;

  // Grant XP: base + page bonus + speed bonus
  const xpEarned = 200 + pages * 75 + Math.max(0, Math.round((180 - time) * 2));
  const leveled  = addXP(user, xpEarned);

  // Achievements
  const newAchievements = checkAchievements(user, { escaped: true, wasCaught: false, pages, time, health, battery, score });

  // Leaderboard
  leaderboard.push({ username: user.username, score, pages, time, date: new Date().toISOString() });
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 50) leaderboard.splice(50);

  res.json({ message: 'Escaped', score, xpEarned, leveled, user: publicUser(user), newAchievements });
});

// ─── PROFILE ─────────────────────────────────────────────────────────────────
app.get('/api/game/profile', verifyToken, (req, res) => {
  const user = [...users.values()].find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user), allAchievements: ACHIEVEMENT_DEFS });
});

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────
app.get('/api/game/leaderboard', (req, res) => {
  res.json({ scores: leaderboard.slice(0, 20) });
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────
app.get('/api/game/settings', verifyToken, (req, res) => {
  res.json({ settings: settings.get(req.user.userId) || { sound: true, music: true, difficulty: 'normal' } });
});
app.put('/api/game/settings', verifyToken, (req, res) => {
  const updated = { ...(settings.get(req.user.userId) || {}), ...req.body };
  settings.set(req.user.userId, updated);
  res.json({ message: 'Settings updated', settings: updated });
});

app.get('/api/health', (_, res) => res.json({ status: 'OK', players: users.size }));

// ─── PAGES ────────────────────────────────────────────────────────────────────
const pages_ = ['index', 'loading', 'chapter1', 'caught', 'survive', 'pause', 'profile', 'leaderboard'];
pages_.forEach(p => {
  app.get(`/${p === 'index' ? '' : p}`, (req, res) =>
    res.sendFile(path.join(__dirname, 'public', p === 'index' ? 'index.html' : `${p}.html`)));
  if (p !== 'index')
    app.get(`/${p}.html`, (req, res) =>
      res.sendFile(path.join(__dirname, 'public', `${p}.html`)));
});

app.listen(PORT, () => {
  console.log(`\n🎮 Monster Under The Bed`);
  console.log(`🚀 http://localhost:${PORT}`);
  console.log(`📡 /api/game — register · login · save · load · caught · escaped · profile · leaderboard\n`);
});
