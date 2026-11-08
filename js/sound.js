// 에셋 없이 WebAudio로 만든 효과음과 배경음. 소리를 켜면 신비로운 배경음이 계속 흐른다.
let ctx = null;
let on = false;

export function setSound(v) {
  on = v;
  if (on && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (ctx) ambient(on);
}

/* ───────── 배경음 ─────────
   낮게 깔리는 화음(살짝 어긋난 사인·삼각파 두 겹)이 16초마다 천천히 다음 화음으로 미끄러지고,
   필터가 숨 쉬듯 열렸다 닫힌다. 그 위로 몇 초에 한 번 높은 종소리가 메아리(딜레이)와 함께 울린다. */
const CHORDS = [
  [110.0, 164.81, 246.94, 261.63], // Am(add9)
  [87.31, 130.81, 220.0, 329.63],  // Fmaj7
  [73.42, 146.83, 220.0, 349.23],  // Dm
  [82.41, 123.47, 196.0, 293.66],  // Em7
];
const BELLS = [659.25, 783.99, 880.0, 987.77, 1174.66, 1318.51]; // A 단조 5음 위쪽
let amb = null;

function ambient(play) {
  if (play && !amb) {
    const t = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(.055, t + 4);
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 700; filter.Q.value = .7;
    const lfo = ctx.createOscillator(); lfo.frequency.value = .05;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 380;
    lfo.connect(lfoAmt).connect(filter.frequency); lfo.start();
    filter.connect(master);

    const voices = CHORDS[0].map((f, i) => ['sine', 'triangle'].map((type, j) => {
      const o = ctx.createOscillator();
      o.type = type; o.frequency.value = f; o.detune.value = j ? 6 : -6;
      const g = ctx.createGain(); g.gain.value = (i ? .22 : .32) * (j ? .5 : 1);
      o.connect(g).connect(filter); o.start();
      return o;
    })).flat();

    // 종소리 메아리
    const delay = ctx.createDelay(2); delay.delayTime.value = .42;
    const fb = ctx.createGain(); fb.gain.value = .42;
    const wet = ctx.createGain(); wet.gain.value = .5;
    delay.connect(fb).connect(delay); delay.connect(wet).connect(master);

    let ci = 0;
    const chordTimer = setInterval(() => {
      ci = (ci + 1) % CHORDS.length;
      const now = ctx.currentTime;
      voices.forEach((o, k) => o.frequency.setTargetAtTime(CHORDS[ci][k >> 1], now, 2.5));
    }, 16000);

    const bell = () => {
      if (!amb) return;
      const now = ctx.currentTime;
      const f = BELLS[Math.floor(Math.random() * BELLS.length)];
      [1, 2.01].forEach((m, k) => {
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(k ? .05 : .16, now + .02);
        g.gain.exponentialRampToValueAtTime(.0001, now + 3.2);
        o.connect(g); g.connect(master); g.connect(delay);
        o.start(now); o.stop(now + 3.3);
      });
      amb.bellTimer = setTimeout(bell, 3500 + Math.random() * 5000);
    };
    amb = { master, voices, lfo, chordTimer, bellTimer: setTimeout(bell, 2500) };
  } else if (!play && amb) {
    const { master, voices, lfo, chordTimer, bellTimer } = amb;
    amb = null;
    clearInterval(chordTimer); clearTimeout(bellTimer);
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => { voices.forEach((o) => o.stop()); lfo.stop(); master.disconnect(); }, 1400);
  }
}

// 다른 탭으로 가면 소리를 멈추고, 돌아오면 이어서
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
});
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
