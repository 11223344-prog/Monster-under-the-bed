/* ═══════════════════════════════════════════════════════════════
   Monster Under The Bed — Procedural Sound Engine
   No audio files. Everything is synthesized with the Web Audio API:
   oscillators, filtered noise, and gain envelopes.
   ═══════════════════════════════════════════════════════════════ */

const Sound = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let unlocked = false;

  // Loop handles
  let droneNodes = null;   // ambient dark-room drone
  let heartbeatHandle = null;
  let flashlightHumNodes = null;

  let muted = (localStorage.getItem('mutb_muted') === '1');

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(master);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(master);
    return ctx;
  }

  // Must be called from a user gesture (click/keydown) to unlock audio on
  // browsers that require it.
  function unlock() {
    const c = ensureCtx();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    unlocked = true;
  }

  function toggleMute() {
    muted = !muted;
    localStorage.setItem('mutb_muted', muted ? '1' : '0');
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
    return muted;
  }
  function isMuted() { return muted; }

  // ── Noise buffer helper (for footsteps, static, wind) ─────────────────────
  let noiseBuffer = null;
  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    const c = ensureCtx();
    const len = c.sampleRate * 2;
    noiseBuffer = c.createBuffer(1, len, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function noiseSource() {
    const c = ensureCtx();
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;
    return src;
  }

  // ── One-shot: footstep ─────────────────────────────────────────────────────
  function footstep() {
    const c = ensureCtx();
    if (!c) return;
    const src = noiseSource();
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 340 + Math.random() * 120;
    const g = c.createGain();
    const t = c.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(filt); filt.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + 0.1);
  }

  // ── One-shot: flashlight click ──────────────────────────────────────────────
  function flashlightClick(on) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(on ? 1400 : 700, t);
    osc.frequency.exponentialRampToValueAtTime(on ? 2200 : 300, t + 0.04);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.07);
  }

  // Soft electrical hum while the flashlight is on
  function startFlashlightHum() {
    const c = ensureCtx();
    if (!c || flashlightHumNodes) return;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 120;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.03, c.currentTime, 0.2);
    osc.connect(g); g.connect(sfxGain);
    osc.start();
    flashlightHumNodes = { osc, g };
  }
  function stopFlashlightHum() {
    if (!flashlightHumNodes) return;
    const c = ensureCtx();
    const { osc, g } = flashlightHumNodes;
    g.gain.setTargetAtTime(0, c.currentTime, 0.1);
    osc.stop(c.currentTime + 0.4);
    flashlightHumNodes = null;
  }

  // ── One-shot: battery dead ───────────────────────────────────────────────
  function batteryDead() {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.5);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.6);
  }

  // ── One-shot: page pickup chime ─────────────────────────────────────────────
  function pageCollect() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    [660, 880, 1320].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.07;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.22, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(g); g.connect(sfxGain);
      osc.start(start); osc.stop(start + 0.36);
    });
  }

  // ── One-shot: monster stunned by flashlight ──────────────────────────────
  function monsterStunned() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.4);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.5);
  }

  // ── One-shot: monster alert sting ("it sees you") ────────────────────────
  function monsterAlert() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.linearRampToValueAtTime(140, t + 0.15);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.55);
  }

  // ── One-shot: jumpscare (bed scare / monster emerges) ────────────────────
  function jumpscare() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    // Noise burst
    const src = noiseSource();
    const filt = c.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = 400;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.6, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    src.connect(filt); filt.connect(ng); ng.connect(sfxGain);
    src.start(t); src.stop(t + 0.5);
    // Descending shriek
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.9);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.95);
  }

  // ── Heartbeat loop (low health / being hunted) ────────────────────────────
  function startHeartbeat(bpm = 100) {
    stopHeartbeat();
    const interval = 60000 / bpm;
    function beat() {
      const c = ensureCtx();
      if (!c) return;
      const t = c.currentTime;
      [0, 0.14].forEach(delay => {
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = 55;
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.linearRampToValueAtTime(0.35, t + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.18);
        osc.connect(g); g.connect(sfxGain);
        osc.start(t + delay); osc.stop(t + delay + 0.2);
      });
    }
    beat();
    heartbeatHandle = setInterval(beat, interval);
  }
  function stopHeartbeat() {
    if (heartbeatHandle) { clearInterval(heartbeatHandle); heartbeatHandle = null; }
  }

  // ── Ambient dark-room drone loop ─────────────────────────────────────────
  function startDrone() {
    const c = ensureCtx();
    if (!c || droneNodes) return;
    const o1 = c.createOscillator();
    const o2 = c.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 55;
    o2.type = 'sine'; o2.frequency.value = 58.2; // slow beating for unease
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(0.05, c.currentTime, 1.5);

    // Slow filtered noise "wind"
    const src = noiseSource();
    const filt = c.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 200;
    const ng = c.createGain();
    ng.gain.value = 0;
    ng.gain.setTargetAtTime(0.02, c.currentTime, 2);

    o1.connect(g); o2.connect(g); g.connect(musicGain);
    src.connect(filt); filt.connect(ng); ng.connect(musicGain);
    o1.start(); o2.start(); src.start();

    droneNodes = { o1, o2, g, src, ng };
  }
  function stopDrone() {
    if (!droneNodes) return;
    const c = ensureCtx();
    const { o1, o2, g, src, ng } = droneNodes;
    g.gain.setTargetAtTime(0, c.currentTime, 0.3);
    ng.gain.setTargetAtTime(0, c.currentTime, 0.3);
    o1.stop(c.currentTime + 1); o2.stop(c.currentTime + 1); src.stop(c.currentTime + 1);
    droneNodes = null;
  }

  // ── One-shot: UI click / hover ───────────────────────────────────────────
  function uiClick() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 520;
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.09);
  }
  function uiHover() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = 300;
    g.gain.setValueAtTime(0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 0.06);
  }

  // ── One-shot: caught / game over sting ───────────────────────────────────
  function caughtSting() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    osc.connect(g); g.connect(sfxGain);
    osc.start(t); osc.stop(t + 1.3);
  }

  // ── One-shot: escape / victory fanfare ───────────────────────────────────
  function victoryFanfare() {
    const c = ensureCtx();
    if (!c) return;
    const t = c.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = t + i * 0.12;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.25, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(g); g.connect(sfxGain);
      osc.start(start); osc.stop(start + 0.52);
    });
  }

  return {
    unlock, toggleMute, isMuted,
    footstep, flashlightClick, startFlashlightHum, stopFlashlightHum,
    batteryDead, pageCollect, monsterStunned, monsterAlert, jumpscare,
    startHeartbeat, stopHeartbeat, startDrone, stopDrone,
    uiClick, uiHover, caughtSting, victoryFanfare,
  };
})();
