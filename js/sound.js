// 에셋 없이 WebAudio로 만든 효과음과 배경음.
// 모든 소리는 버스 하나로 모여 작은 방 울림(리버브)과 리미터(컴프레서)를 거친다: 겹쳐도 깨지지 않고 한 공간에서 나는 소리처럼.
let ctx = null;
let on = false;
let bus = null; // { sfx, music, verb }

export const soundOn = () => on;

export function setSound(v) {
  on = v;
  if (on && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    bus = makeBus();
  }
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  ambient(on);
}

function makeBus() {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14; limiter.knee.value = 10; limiter.ratio.value = 6; limiter.attack.value = .003; limiter.release.value = .25;
  limiter.connect(ctx.destination);
  // 리버브: 지수적으로 사라지는 잡음으로 만든 2.2초 임펄스(한 번만 만든다)
  const verb = ctx.createConvolver();
  const len = Math.floor(ctx.sampleRate * 2.2);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  verb.buffer = ir;
  const verbOut = ctx.createGain(); verbOut.gain.value = .5;
  verb.connect(verbOut).connect(limiter);
  const sfxBus = ctx.createGain(); sfxBus.gain.value = .9; sfxBus.connect(limiter);
  const sfxSend = ctx.createGain(); sfxSend.gain.value = .18; sfxBus.connect(sfxSend).connect(verb);
  const music = ctx.createGain(); music.gain.value = 1; music.connect(limiter);
  const musicSend = ctx.createGain(); musicSend.gain.value = .7; music.connect(musicSend).connect(verb);
  return { sfx: sfxBus, music, verb };
}

/* ───────── 소리 재료 ───────── */
const now = () => ctx.currentTime;
const rand = (a, b) => a + Math.random() * (b - a);

/** 사인 하나: 주파수 미끄럼(to), 짧은 어택, 지수 감쇠 */
function tone(freq, dur, { gain = .1, to = null, delay = 0, attack = .004, type = 'sine', out = bus.sfx } = {}) {
  const t = now() + delay;
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * .8);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + dur + .05);
}

/** 걸러진 잡음: 바람·종이·불꽃·출렁임의 재료. sweep 로 필터 주파수를 움직인다 */
function noise(dur, { freq = 2000, to = null, q = 1, gain = .2, type = 'bandpass', delay = 0, attack = .005, out = bus.sfx } = {}) {
  const t = now() + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t); src.stop(t + dur + .02);
}

/** 유리: 서로 정수배가 아닌 배음 여러 개가 겹치고 높은 배음일수록 빨리 사라진다. 맨 앞에 아주 짧은 '틱' */
const GLASS = [[1, 1, 1.4], [2.32, .45, .9], [4.25, .25, .55], [6.63, .12, .35]];
function glass(f, { gain = .09, delay = 0, len = 1, out = bus.sfx } = {}) {
  GLASS.forEach(([m, a, d]) => tone(f * m * rand(.995, 1.005), d * len, { gain: gain * a, delay, attack: .002, out }));
  noise(.012, { freq: 7000, type: 'highpass', gain: gain * .35, delay, attack: .001, out });
}

/** 물방울: 공기방울 공명이라 음이 위로 올라간다 */
function drop(f = 520, { gain = .12, delay = 0 } = {}) {
  tone(f, .12, { gain, to: f * 2.4, delay, attack: .003 });
}

/* ───────── 효과음 ───────── */
const ok = () => on && ctx;
export const sfx = {
  /** 버튼: 짧고 부드러운 나무 톡 */
  tap() { if (!ok()) return; tone(1150, .05, { gain: .05, to: 900, attack: .002 }); },
  /** 유리병을 건드릴 때 */
  glass(pitch = 0) { if (!ok()) return; glass(1500 * 2 ** (pitch / 12) * rand(.97, 1.03), { gain: .085 }); },
  /** 병마개를 뽑을 때: 코르크 뽁 + 유리 딩 */
  cork() { if (!ok()) return; tone(620, .07, { gain: .14, to: 180, attack: .002 }); noise(.03, { freq: 900, q: 2, gain: .06 }); glass(rand(1700, 2100), { gain: .05, delay: .05, len: .7 }); },
  /** 솥에 떨어질 때: 첨벙 + 방울 몇 개 */
  plop() {
    if (!ok()) return;
    noise(.18, { freq: 900, to: 300, type: 'lowpass', gain: .16, attack: .004 });
    drop(380, { gain: .13 });
    for (let i = 0; i < 3; i++) drop(rand(600, 1000), { gain: .05, delay: .1 + i * rand(.06, .11) });
  },
  /** 맞힘: 유리 종 두 음이 위로 */
  hit() { if (!ok()) return; glass(1318.5, { gain: .07, len: .9 }); glass(1975.5, { gain: .06, delay: .09, len: 1.1 }); },
  /** 빗나감: 낮고 부드러운 통 */
  miss() { if (!ok()) return; tone(260, .22, { gain: .09, to: 200, attack: .004 }); tone(390, .14, { gain: .03, to: 300, attack: .004 }); },
  /** 젓기: 물이 출렁이는 소리 */
  swish(p = .5) { if (!ok()) return; noise(.3, { freq: 380 + p * 300, to: 220, type: 'lowpass', q: 3, gain: .12, attack: .06 }); },
  /** 환영이 떠오름: 반짝이는 상행 아르페지오 */
  vision() { if (!ok()) return; [1046.5, 1318.5, 1568, 2093].forEach((f, i) => glass(f, { gain: .045, delay: i * .09, len: 1.3 })); },
  /** 봉랍 두드리기: 둔탁한 톡 */
  knock() { if (!ok()) return; tone(170, .12, { gain: .18, to: 110, attack: .002 }); noise(.03, { freq: 1600, q: 1, gain: .06 }); },
  /** 봉랍이 깨짐: 밀랍이 딱딱 갈라지고 병이 열린다 */
  crack() {
    if (!ok()) return;
    [0, .05, .11].forEach((d, i) => noise(.04, { freq: 2600 - i * 500, q: 3, gain: .16, delay: d, attack: .001 }));
    tone(700, .09, { gain: .12, to: 200, delay: .16, attack: .002 });
    glass(2093, { gain: .05, delay: .2, len: 1.4 });
  },
  /** 불 지피기: 화르륵(바람) + 쿵 + 타닥타닥 */
  ignite() {
    if (!ok()) return;
    noise(1.3, { freq: 250, to: 1800, type: 'bandpass', q: .8, gain: .2, attack: .25 });
    noise(1.0, { freq: 120, to: 400, type: 'lowpass', gain: .14, attack: .15 });
    tone(110, .5, { gain: .2, to: 48, attack: .005 });
    for (let i = 0; i < 12; i++) noise(rand(.008, .02), { freq: rand(2500, 6000), q: 2, gain: rand(.05, .14), delay: rand(.25, 1.5), attack: .001 });
  },
  /** 책·카드 넘김: 종이 사락 */
  page() { if (!ok()) return; noise(.16, { freq: 3500, to: 1800, q: .7, gain: .07, attack: .04 }); },
  /** 깃펜으로 쓰기 */
  quill() { if (!ok()) return; for (let i = 0; i < 5; i++) noise(rand(.04, .07), { freq: rand(4500, 6500), q: 4, gain: .035, delay: i * rand(.08, .12), attack: .01 }); },
};

/* ───────── 배경음: 밝고 몽환적인 오르골 ─────────
   높은 음역의 밝은 화음 패드가 아주 작게 깔리고(16초마다 다음 화음으로 미끄러짐),
   그 위로 오르골 같은 반짝임이 장조 5음에서 드문드문 떨어진다. 모두 리버브로 넓게 퍼진다. */
const CHORDS = [
  [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
  [349.23, 440.0, 523.25, 659.25, 783.99], // Fmaj9
  [220.0, 329.63, 392.0, 523.25, 659.25],  // Am7
  [196.0, 293.66, 392.0, 523.25, 587.33],  // Gsus
];
const SPARKLE = [1046.5, 1174.66, 1318.51, 1567.98, 1760.0, 2093.0, 2349.32]; // C 장조 5음(높은 옥타브)
let amb = null;

function ambient(play) {
  if (play && !amb) {
    const t = now();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, t);
    master.gain.linearRampToValueAtTime(.022, t + 5);
    master.connect(bus.music);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 2200; filter.Q.value = .5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = .07;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 600;
    lfo.connect(lfoAmt).connect(filter.frequency); lfo.start();
    // 숨 쉬는 듯한 음량 흔들림
    const trem = ctx.createGain(); trem.gain.value = .85;
    const tlfo = ctx.createOscillator(); tlfo.frequency.value = .13;
    const tAmt = ctx.createGain(); tAmt.gain.value = .15;
    tlfo.connect(tAmt).connect(trem.gain); tlfo.start();
    filter.connect(trem).connect(master);

    const voices = CHORDS[0].map((f) => [-7, 7].map((det) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.detune.value = det;
      const g = ctx.createGain(); g.gain.value = .16;
      o.connect(g).connect(filter); o.start();
      return o;
    })).flat();

    let ci = 0;
    const chordTimer = setInterval(() => {
      ci = (ci + 1) % CHORDS.length;
      voices.forEach((o, k) => o.frequency.setTargetAtTime(CHORDS[ci][k >> 1], now(), 3));
    }, 16000);

    const sparkle = () => {
      if (!amb) return;
      const n = Math.random() < .35 ? 3 : 1; // 가끔 세 음이 이어 반짝
      let f = SPARKLE[Math.floor(Math.random() * SPARKLE.length)];
      for (let i = 0; i < n; i++) {
        glass(f, { gain: .028, delay: i * .16, len: 1.6, out: bus.music });
        f = SPARKLE[Math.min(SPARKLE.length - 1, SPARKLE.indexOf(f) + 1 + (Math.random() < .5 ? 1 : 0))];
      }
      amb.sparkleTimer = setTimeout(sparkle, rand(2600, 6000));
    };
    amb = { master, voices, lfos: [lfo, tlfo], chordTimer, sparkleTimer: setTimeout(sparkle, 2000) };
  } else if (!play && amb) {
    const { master, voices, lfos, chordTimer, sparkleTimer } = amb;
    amb = null;
    clearInterval(chordTimer); clearTimeout(sparkleTimer);
    const t = now();
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1.2);
    setTimeout(() => { [...voices, ...lfos].forEach((o) => o.stop()); master.disconnect(); }, 1400);
  }
}

// 다른 탭으로 가면 소리를 멈추고, 돌아오면 이어서
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
});

export function buzz(ms = 12) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* 무시 */ }
}
