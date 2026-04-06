/**
 * Ringtone using Web Audio API — no external files required.
 * Plays a WhatsApp-style repeating ring pattern.
 */

let ctx = null;
let intervalId = null;
let gainNode = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function playBeep(frequency, startTime, duration, volume = 0.4) {
  const c = getCtx();
  const osc  = c.createOscillator();
  const gain = c.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, startTime);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.setValueAtTime(volume, startTime + duration - 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + duration);

  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

function playRingPattern() {
  const c = getCtx();
  const now = c.currentTime;
  // Two-tone ring: 480Hz + 620Hz — classic phone ring
  playBeep(480, now,        0.4, 0.35);
  playBeep(620, now,        0.4, 0.35);
  playBeep(480, now + 0.5,  0.4, 0.35);
  playBeep(620, now + 0.5,  0.4, 0.35);
}

export function startRingtone() {
  stopRingtone();
  // Resume context (browsers require user gesture before first play)
  if (ctx?.state === 'suspended') ctx.resume();
  playRingPattern();
  intervalId = setInterval(playRingPattern, 2500);
}

export function stopRingtone() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

// Outgoing call dial tone — single repeated pulse
export function startDialTone() {
  stopRingtone();
  function dial() {
    const c = getCtx();
    const now = c.currentTime;
    playBeep(440, now,        0.3, 0.2);
    playBeep(480, now,        0.3, 0.2);
  }
  dial();
  intervalId = setInterval(dial, 1800);
}

// Short connect sound
export function playConnectSound() {
  const c = getCtx();
  const now = c.currentTime;
  playBeep(880, now,        0.08, 0.3);
  playBeep(1100, now + 0.1, 0.08, 0.3);
  playBeep(1320, now + 0.2, 0.15, 0.3);
}

// Short end sound
export function playEndSound() {
  const c = getCtx();
  const now = c.currentTime;
  playBeep(440, now,        0.1, 0.25);
  playBeep(330, now + 0.12, 0.1, 0.25);
  playBeep(220, now + 0.26, 0.18, 0.25);
}
