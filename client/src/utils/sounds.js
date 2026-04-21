// Tiny sound helper for chat send/receive cues.
//
// Strategy: try to play /sounds/send.mp3 or /sounds/receive.mp3 from the
// public folder. If those files aren't present (or autoplay blocks us), we
// fall back to a short synthesized tone via WebAudio so users still get
// feedback.
//
// Drop your own `send.mp3` and `receive.mp3` into `client/public/sounds/`
// to customize — no code change needed.

const audioCache = {};

const getAudio = (name) => {
  if (!audioCache[name]) {
    const a = new Audio(`/sounds/${name}.mp3`);
    a.volume = 0.5;
    a.preload = 'auto';
    audioCache[name] = a;
  }
  return audioCache[name];
};

// WebAudio fallback — different frequency per cue so send vs receive are
// distinguishable without any assets installed.
let _ctx = null;
const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!_ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    _ctx = new Ctx();
  }
  return _ctx;
};

const beep = (freq, durationMs = 110) => {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    /* ignore — some browsers gate AudioContext behind a user gesture */
  }
};

const play = (name, fallbackFreq) => {
  try {
    const a = getAudio(name);
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => beep(fallbackFreq));
    }
  } catch {
    beep(fallbackFreq);
  }
};

export const playSendSound = () => play('send', 880);
export const playReceiveSound = () => play('receive', 520);
