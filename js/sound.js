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

function noise(dur, { freq = 2000, q = 1, gain = .3, type = 'bandpass' } = {}) {
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
  src.start();
  return { f, src };
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
  tap() { if (!on || !ctx) return; tone(660, .06, { type: 'triangle', gain: .08 }); },
  pop() { if (!on || !ctx) return; noise(.12, { freq: 3200, q: .8, gain: .5 }); tone(240, .12, { type: 'square', gain: .05, to: 120 }); },
  hit() { if (!on || !ctx) return; tone(784, .12, { type: 'triangle', gain: .12 }); tone(1175, .2, { type: 'triangle', gain: .1, delay: .09 }); },
  miss() { if (!on || !ctx) return; tone(330, .18, { type: 'sawtooth', gain: .05, to: 220 }); },
  click() { if (!on || !ctx) return; noise(.04, { freq: 1200, gain: .4, type: 'highpass' }); },
  hum: null,
  startHum() {
    if (!on || !ctx || this.hum) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 120;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600;
    g.gain.value = .0001; g.gain.exponentialRampToValueAtTime(.04, ctx.currentTime + .2);
    o.connect(f).connect(g).connect(ctx.destination); o.start();
    this.hum = { o, g, f };
  },
  setHum(p) { if (this.hum) { this.hum.o.frequency.value = 120 + p * 260; this.hum.f.frequency.value = 600 + p * 1800; } },
  stopHum() {
    if (!this.hum) return;
    const { o, g } = this.hum;
    g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .1);
    o.stop(ctx.currentTime + .12);
    this.hum = null;
  },
  dev() { if (!on || !ctx) return; tone(1320, .5, { gain: .08 }); tone(1980, .6, { gain: .05, delay: .05 }); },
  tear(p = 1) { if (!on || !ctx) return; noise(.05, { freq: 900 + p * 2000, q: 2, gain: .25 }); },
  print() { if (!on || !ctx) return; for (let i = 0; i < 12; i++) tone(1800 + (i % 3) * 200, .03, { type: 'square', gain: .025, delay: i * .09 }); },
};

export function buzz(ms = 12) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* 무시 */ }
}
