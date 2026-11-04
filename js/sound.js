// 에셋 없이 WebAudio로 만든 작은 효과음. 기본은 꺼짐.
let ctx = null;
let on = false;

export function setSound(v) {
  on = v;
  if (on && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}
export const soundOn = () => on;
const ok = () => on && ctx;

function noise(dur, { freq = 2000, q = 1, gain = .3, type = 'bandpass', delay = 0 } = {}) {
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(ctx.currentTime + delay);
}

function tone(freq, dur, { type = 'sine', gain = .15, to = null, delay = 0 } = {}) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + .02);
}

export const sfx = {
  tap() { if (!ok()) return; tone(660, .06, { type: 'triangle', gain: .07 }); },
  cork() { if (!ok()) return; tone(900, .08, { type: 'square', gain: .05, to: 300 }); noise(.05, { freq: 2500, gain: .3 }); },
  plop() { if (!ok()) return; tone(420, .22, { gain: .25, to: 90 }); for (let i = 0; i < 4; i++) tone(500 + Math.random() * 600, .08, { gain: .06, to: 1400, delay: .15 + i * .09 }); },
  hit() { if (!ok()) return; tone(784, .12, { type: 'triangle', gain: .12 }); tone(1175, .25, { type: 'triangle', gain: .1, delay: .09 }); },
  miss() { if (!ok()) return; tone(330, .2, { type: 'sawtooth', gain: .04, to: 200 }); },
  swish(p = .5) { if (!ok()) return; noise(.12, { freq: 500 + p * 900, q: 1.5, gain: .18 }); },
  vision() { if (!ok()) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, .9, { gain: .05, delay: i * .08 })); },
  knock() { if (!ok()) return; tone(180, .1, { type: 'square', gain: .08, to: 90 }); noise(.04, { freq: 1200, gain: .3 }); },
  crack() { if (!ok()) return; noise(.25, { freq: 3000, q: .6, gain: .5 }); tone(1500, .4, { gain: .05, to: 3000, delay: .1 }); },
  quill() { if (!ok()) return; for (let i = 0; i < 6; i++) noise(.03, { freq: 4000, q: 3, gain: .08, delay: i * .07 }); },
};

export function buzz(ms = 12) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* 무시 */ }
}
