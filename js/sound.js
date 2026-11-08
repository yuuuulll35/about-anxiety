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
  GLASS.forEach(([m, a, d]) => { if (f * m < 16000) tone(f * m * rand(.995, 1.005), d * len, { gain: gain * a, delay, attack: .002, out }); });
  noise(.012, { freq: 7000, type: 'highpass', gain: gain * .35, delay, attack: .001, out });
}

/** 물방울·거품: 공기방울 공명이라 음이 위로 휙 올라간다 */
function drop(f = 520, { gain = .12, delay = 0, dur = .12, out = bus.sfx } = {}) {
  tone(f, dur, { gain, to: f * 2.2, delay, attack: .003, out });
}

/** 갈색 잡음(낮은 쪽이 두꺼운 잡음): 물이 출렁이는 소리의 재료. 2초짜리를 한 번만 만들어 돌려 쓴다 */
let brownBuf = null;
function brown() {
  if (brownBuf) return brownBuf;
  const len = ctx.sampleRate * 2;
  brownBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = brownBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
  return brownBuf;
}

/** 목소리 비슷한 소리: 톱니파를 모음 공명(포먼트) 두 개로 걸러 "음~" 하고 속삭이는 느낌 */
function hum(f0, f1, dur, { gain = .5, delay = 0, vowel = [650, 1100] } = {}) {
  const t = now() + delay;
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * .7);
  const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
  const va = ctx.createGain(); va.gain.value = f0 * .012; vib.connect(va).connect(o.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .05);
  g.gain.setValueAtTime(gain, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  vowel.forEach((fq, k) => {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = 7;
    const lv = ctx.createGain(); lv.gain.value = k ? .55 : 1;
    o.connect(bp).connect(lv).connect(g);
  });
  g.connect(bus.sfx);
  o.start(t); vib.start(t); o.stop(t + dur + .05); vib.stop(t + dur + .05);
}

/** 심장 한 번: 낮게 쿵 */
function thump(delay, gain = .32) {
  tone(78, .2, { gain, to: 42, delay, attack: .004 });
  noise(.06, { freq: 180, type: 'lowpass', gain: gain * .4, delay, attack: .003 });
}

/* ───────── 젓기: 걸쭉한 물약이 출렁이는 소리 ─────────
   갈색 잡음을 공명이 센 저역 필터에 통과시키고(물이 '촤아' 하는 낮은 울림), 젓는 빠르기에 따라 크기·밝기를 바꾼다.
   그 위로 작은 거품이 뽀록뽀록 올라온다. 손을 멈추면 부드럽게 잦아든다. */
let stirV = null;
function stirMove(speed = .6) {
  if (!ok()) return;
  const t = now();
  if (!stirV) {
    const src = ctx.createBufferSource(); src.buffer = brown(); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280; lp.Q.value = 6;
    const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 1400;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(lp).connect(lp2).connect(g).connect(bus.sfx);
    src.start(t, Math.random() * 1.5);
    stirV = { src, lp, g, bubT: 0, idle: 0, ph: 0 };
    drop(rand(240, 320), { gain: .07, dur: .16 }); // 첫 휘저음: 꿀렁
  }
  const v = stirV;
  v.ph += .5 + speed;
  v.g.gain.setTargetAtTime(.06 + speed * .12, t, .07);
  v.lp.frequency.setTargetAtTime(240 + speed * 420 + Math.sin(v.ph) * 90, t, .05);
  if (t - v.bubT > .07 && Math.random() < .25 + speed * .45) { v.bubT = t; drop(rand(280, 760), { gain: rand(.025, .055), dur: rand(.06, .1) }); }
  clearTimeout(v.idle);
  v.idle = setTimeout(stirStop, 160);
}
function stirStop() {
  const v = stirV;
  if (!v || !ctx) return;
  stirV = null;
  clearTimeout(v.idle);
  const t = now();
  v.g.gain.cancelScheduledValues(t);
  v.g.gain.setTargetAtTime(0, t, .18);
  v.src.stop(t + 1);
  for (let i = 0; i < 2; i++) drop(rand(300, 600), { gain: .03, delay: .08 + i * .12, dur: .08 }); // 잦아들며 마지막 거품
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
  /** 젓는 동안 계속 부른다(speed 0~1). 멈추면 알아서 잦아든다 */
  stir(speed) { stirMove(speed); },
  stirStop() { stirStop(); },
  /** 환영이 떠오름: 반짝이는 상행 아르페지오 */
  vision() { if (!ok()) return; [1046.5, 1318.5, 1568, 2093].forEach((f, i) => glass(f, { gain: .045, delay: i * .09, len: 1.3 })); },
  /** 코르크 두드리기: 나무 톡 + 유리병이 살짝 울림 */
  knock() { if (!ok()) return; tone(420, .07, { gain: .14, to: 260, attack: .002 }); noise(.025, { freq: 1800, q: 1.5, gain: .07 }); glass(rand(1100, 1300), { gain: .03, delay: .01, len: .5 }); },
  /** 코르크가 뽁 빠지고 병이 열린다 */
  pop() { if (!ok()) return; tone(900, .09, { gain: .2, to: 160, attack: .002 }); noise(.05, { freq: 700, q: 1, gain: .12 }); noise(.5, { freq: 2200, to: 900, q: .7, gain: .05, delay: .08, attack: .05 }); [1318.5, 1760, 2093].forEach((f, i) => glass(f, { gain: .045, delay: .18 + i * .08, len: 1.3 })); },
  /** 봉랍이 깨짐: 밀랍이 딱딱 갈라지고 병이 열린다 */
  crack() {
    if (!ok()) return;
    [0, .05, .11].forEach((d, i) => noise(.04, { freq: 2600 - i * 500, q: 3, gain: .16, delay: d, attack: .001 }));
    tone(700, .09, { gain: .12, to: 200, delay: .16, attack: .002 });
    glass(2093, { gain: .05, delay: .2, len: 1.4 });
  },
  /** 불 지피기: 화르륵 → 보글보글 끓는 거품 → 1.3초에 펑! 하고 반짝 */
  ignite() {
    if (!ok()) return;
    noise(1.1, { freq: 250, to: 1500, type: 'bandpass', q: .8, gain: .16, attack: .2 });
    tone(110, .4, { gain: .16, to: 48, attack: .005 });
    for (let i = 0; i < 6; i++) noise(rand(.008, .02), { freq: rand(2500, 6000), q: 2, gain: rand(.04, .1), delay: rand(.1, 1), attack: .001 });
    for (let i = 0; i < 16; i++) drop(rand(260, 700), { gain: rand(.04, .08), delay: .3 + i * .055 + rand(0, .03), dur: rand(.06, .11) }); // 보글보글
    noise(.5, { freq: 900, to: 160, type: 'lowpass', q: 1.2, gain: .3, delay: 1.3, attack: .005 }); // 펑
    tone(150, .35, { gain: .24, to: 55, delay: 1.3, attack: .003 });
    noise(.8, { freq: 3000, to: 1200, q: .6, gain: .05, delay: 1.36, attack: .06 }); // 연기 쉬익
    [1568, 2093, 2637].forEach((f, i) => glass(f, { gain: .035, delay: 1.4 + i * .07, len: 1 }));
  },
  /** 책·카드 넘김: 종이 사락 */
  page() { if (!ok()) return; noise(.16, { freq: 3500, to: 1800, q: .7, gain: .07, attack: .04 }); },
  /** 깃펜으로 쓰기 */
  quill() { if (!ok()) return; for (let i = 0; i < 5; i++) noise(rand(.04, .07), { freq: rand(4500, 6500), q: 4, gain: .035, delay: i * rand(.08, .12), attack: .01 }); },
  /** 사랑의 언어 고르기: 표현마다 제 소리 */
  lang(type) {
    if (!ok()) return;
    switch (type) {
      case '다정한 말': // 다정한 속삭임 "음~ 응?" 두 마디
        hum(300, 360, .3, { gain: .55, vowel: [700, 1150] });
        hum(380, 470, .36, { gain: .5, delay: .28, vowel: [500, 1000] });
        noise(.25, { freq: 4200, q: 1.2, gain: .02, attack: .05 }); // 숨결
        break;
      case '함께하는 시간': // 째깍째깍 + 작은 탁상시계 종
        [0, .2, .4, .6].forEach((d, i) => { noise(.012, { freq: i % 2 ? 1700 : 2600, q: 6, gain: .22, delay: d, attack: .001 }); tone(i % 2 ? 1300 : 1900, .03, { gain: .04, delay: d, attack: .001 }); });
        glass(1568, { gain: .05, delay: .82, len: 1.2 }); glass(1046.5, { gain: .04, delay: .82, len: 1.4 });
        break;
      case '선물': // 포장지 바스락 → 리본 스르륵 → 반짝
        noise(.22, { freq: 3800, to: 2600, q: .9, gain: .09, attack: .02 });
        noise(.18, { freq: 1200, to: 6000, q: 2.5, gain: .07, delay: .2, attack: .03 });
        [1318.5, 1760, 2349.3].forEach((f, i) => glass(f, { gain: .04, delay: .4 + i * .07, len: 1 }));
        break;
      case '챙겨 주기': // 찻잔 딸깍 + 차 따르는 소리
        glass(2700, { gain: .06, len: .35 }); glass(3500, { gain: .03, delay: .02, len: .3 });
        noise(.5, { freq: 700, to: 1100, type: 'lowpass', q: 4, gain: .08, delay: .14, attack: .08 });
        for (let i = 0; i < 5; i++) drop(rand(700, 1200), { gain: .025, delay: .2 + i * .07, dur: .06 });
        break;
      case '스킨십': // 두근-두근, 두근-두근
        thump(0); thump(.17, .24); thump(.72); thump(.89, .24);
        break;
      default: // 모르겠어: "흐음?" 고개 갸웃
        tone(520, .16, { gain: .07, to: 400, attack: .01, type: 'triangle' });
        tone(400, .28, { gain: .07, to: 640, delay: .17, attack: .01, type: 'triangle' });
    }
  },
};

/* ───────── 배경음: 달밤 다락방의 느린 왈츠 ─────────
   반짝이를 무작위로 뿌리던 예전 배경음은 정답 효과음과 구분이 안 됐다. 이제는 박자가 분명한 3/4 왈츠다:
   쿵(낮은 현) · 짝 · 짝(부드러운 기타 화음) 위로 오카리나 같은 선율이 흐르고, 한 바퀴는 선율 없이 반주만 쉰다.
   D 도리안이라 살짝 신비롭고 아늑하다. 효과음 대역(높은 유리 소리)과 겹치지 않게 중저역 위주로 만든다. */
const BPM = 92, BEAT = 60 / BPM, BAR = BEAT * 3;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
// [베이스 음, 화음 음들] 마디마다
const PROG = [
  [38, [62, 65, 69]], [38, [62, 65, 69]], [36, [60, 64, 67]], [36, [60, 64, 67]],
  [34, [58, 62, 65]], [34, [58, 62, 65]], [33, [57, 61, 64]], [33, [55, 61, 64]],
  [38, [62, 65, 69]], [41, [60, 65, 69]], [43, [59, 62, 67]], [38, [62, 65, 69]],
  [34, [58, 62, 65]], [36, [60, 64, 67]], [33, [57, 61, 67]], [38, [57, 62, 65]],
];
// 선율 [음, 박]. 0 은 쉼표
const MEL = [
  [[69, 1], [74, 1], [76, 1]], [[77, 2], [76, 1]], [[76, 1], [74, 1], [72, 1]], [[67, 3]],
  [[65, 1], [70, 1], [74, 1]], [[72, 2], [70, 1]], [[69, 1], [73, 1], [76, 1]], [[76, 2], [0, 1]],
  [[74, 1], [77, 1], [81, 1]], [[79, 1.5], [77, .5], [76, 1]], [[74, 1], [71, 1], [67, 1]], [[69, 3]],
  [[70, 1], [74, 1], [77, 1]], [[76, 1], [79, 1], [76, 1]], [[76, 1], [73, 1], [69, 1]], [[74, 3]],
];

function env(g, t, peak, a, len) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(.0001, t + len);
}
/** 낮은 현 뜯기 */
function bassNote(out, t, m) {
  const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m);
  const s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = mtof(m);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(220, t + .5);
  const g = ctx.createGain(); env(g, t, .16, .012, BAR * .9);
  o.connect(f); s.connect(f); f.connect(g).connect(out);
  o.start(t); s.start(t); o.stop(t + BAR); s.stop(t + BAR);
}
/** 부드러운 나일론 기타 화음(살짝 긁듯 시차) */
function strum(out, t, notes, gain = .028) {
  notes.forEach((m, i) => {
    const tt = t + i * .018;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = mtof(m);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(2200, tt); f.frequency.exponentialRampToValueAtTime(700, tt + .35);
    const g = ctx.createGain(); env(g, tt, gain, .006, BEAT * 1.6);
    o.connect(f).connect(g).connect(out);
    o.start(tt); o.stop(tt + BEAT * 1.7);
  });
}
/** 오카리나: 사인 + 약한 삼각파, 늦게 들어오는 비브라토, 첫머리에 숨소리 */
function ocarina(out, t, m, dur, gain = .07) {
  const fq = mtof(m);
  const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fq;
  const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = fq;
  const o2g = ctx.createGain(); o2g.gain.value = .22;
  const vib = ctx.createOscillator(); vib.frequency.value = 5.2;
  const va = ctx.createGain(); va.gain.setValueAtTime(0, t); va.gain.linearRampToValueAtTime(fq * .007, t + Math.min(.4, dur * .6));
  vib.connect(va); va.connect(o.frequency); va.connect(o2.frequency);
  const g = ctx.createGain();
  const rel = Math.min(.25, dur * .3);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .07);
  g.gain.setValueAtTime(gain * .85, t + dur - rel); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .12);
  o.connect(g); o2.connect(o2g).connect(g); g.connect(out);
  [o, o2, vib].forEach((x) => { x.start(t); x.stop(t + dur + .2); });
  noise(.07, { freq: 1800, q: 1.5, gain: gain * .12, delay: t - now(), attack: .01, out });
}
/** 바닥에 깔리는 아주 옅은 화음 */
function pad(out, t, notes) {
  notes.forEach((m) => [-6, 6].forEach((det) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m - 12); o.detune.value = det;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.008, t + .9); g.gain.setValueAtTime(.008, t + BAR - .2); g.gain.linearRampToValueAtTime(0, t + BAR + .7);
    o.connect(g).connect(out); o.start(t); o.stop(t + BAR + .8);
  }));
}

let amb = null;
function ambient(play) {
  if (play && !amb) {
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now());
    master.gain.linearRampToValueAtTime(.28, now() + 3); // 효과음보다 확실히 뒤에 깔리게(약 -10dB)
    master.connect(bus.music);
    amb = { master, bar: 0, next: now() + .3, timer: 0 };
    const tick = () => {
      if (!amb) return;
      while (amb.next < now() + .5) {
        const t = amb.next, b = amb.bar % PROG.length, cycle = Math.floor(amb.bar / PROG.length);
        const [root, ch] = PROG[b];
        bassNote(master, t, root);
        strum(master, t + BEAT, ch);
        strum(master, t + BEAT * 2, ch, .022);
        pad(master, t, ch);
        if (cycle % 2 === 0) {
          let at = t;
          MEL[b].forEach(([m, beats]) => { if (m) ocarina(master, at, m, beats * BEAT * .96); at += beats * BEAT; });
        }
        amb.bar++; amb.next += BAR;
      }
    };
    tick();
    amb.timer = setInterval(tick, 120);
  } else if (!play && amb) {
    const { master, timer } = amb;
    amb = null;
    clearInterval(timer);
    const t = now();
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(0, t + 1);
    setTimeout(() => master.disconnect(), 1300);
  }
}

// 다른 탭으로 가면 소리를 멈추고, 돌아오면 이어서
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else if (on) { ctx.resume(); if (amb) amb.next = Math.max(amb.next, now() + .1); }
});

export function buzz(ms = 12) {
  try { navigator.vibrate && navigator.vibrate(ms); } catch { /* 무시 */ }
}
