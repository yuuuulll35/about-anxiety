import { ANXIETY, HIDDEN, ATTACH_TYPES, tierOf, TIER_LABEL } from './items.js';
import { parseAnalysis } from './parse.js';
import { SAMPLE } from './sample.js';
import { OOC_PROMPT } from './prompt.js';
import { FILM_ICONS } from './icons.js';
import { cauldronSVG } from './cauldron.js';
import { mixBrew, colorName, hsl, moonPhase } from './brew.js';
import { recipeModel, recipeHTML, recipeCanvas } from './recipe.js';
import { setSound, soundOn, sfx, buzz } from './sound.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');
const smooth = () => (reduced ? 'auto' : 'smooth');
const short = (name) => name.replace(/ ?(불안도|염려도)$/, '');

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

let data = null;
let st = null;
let npc = 'NPC';
let pc = '';
let brew = null;

/* ───────── 토스트 ───────── */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ───────── 소리 ───────── */
const soundBtn = $('#soundBtn');
function paintSound() {
  soundBtn.setAttribute('aria-pressed', String(soundOn()));
  $('.sound-label', soundBtn).textContent = soundOn() ? '소리 켬' : '소리 끔';
}
soundBtn.addEventListener('click', () => {
  setSound(!soundOn());
  store.set('aa.sound', soundOn() ? '1' : '0');
  paintSound(); sfx.tap();
});
if (store.get('aa.sound') === '1') { // 오디오는 첫 사용자 동작 이후에만 켤 수 있다
  window.addEventListener('pointerdown', () => { setSound(true); paintSound(); }, { once: true });
}
paintSound();

/* ───────── 솥 그리기 ───────── */
$('#pot0').innerHTML = cauldronSVG('0');
$('#pot1').innerHTML = cauldronSVG('1');
$('#pot2').innerHTML = cauldronSVG('2', true);
const pots = () => document.querySelectorAll('#room .cauldron');

function setBrewVars(target, b) {
  const s = target.style;
  if (b) {
    s.setProperty('--brew', hsl(b.h, b.s, b.l));
    s.setProperty('--brew-l', hsl(b.h, Math.min(1, b.s + .1), Math.min(.8, b.l + .2)));
    s.setProperty('--brew-d', hsl(b.h, b.s, b.l * .5));
  } else ['--brew', '--brew-l', '--brew-d'].forEach((p) => s.removeProperty(p));
}

function applyBrew() {
  const parts = st ? ANXIETY.filter((d) => st.poured.has(d.key)).map((d) => ({ color: d.color, pct: data.items[d.key].pct })) : [];
  brew = mixBrew(parts);
  setBrewVars(document.documentElement, brew);
  $('#brewColorName').textContent = brew ? `${colorName(brew)} 물약` : '아직 맹물';
  const lv = st ? st.poured.size / 12 : 0;
  pots().forEach((p) => p.style.setProperty('--lv', lv.toFixed(2)));
}

/* ───────── 접수 1: 먼저 짐작 ───────── */
const rxText = $('#rxText');
const npcIn = $('#npcName');
const pcIn = $('#pcName');
rxText.value = store.get('aa.text') || '';
npcIn.value = store.get('aa.npc') || '';
pcIn.value = store.get('aa.pc') || '';
npcIn.addEventListener('input', () => store.set('aa.npc', npcIn.value));
pcIn.addEventListener('input', () => store.set('aa.pc', pcIn.value));

const GUESS_PCT = { low: 20, mid: 55, high: 85 };
const GUESS_H = { low: 24, mid: 55, high: 88 };
const CYCLE = [null, 'low', 'mid', 'high'];
let G = { g: {}, attach: null, sealed: false };
try { G = { ...G, ...JSON.parse(store.get('aa.guess') || '{}') }; } catch { /* 깨진 값은 무시 */ }
const saveGuess = () => store.set('aa.guess', JSON.stringify(G));
const guessN = () => Object.keys(G.g).length;
let guessBrew = null;

function buildGuessShelf() {
  const wrap = $('#guessShelf');
  wrap.innerHTML = '';
  ANXIETY.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `jar guess-jar shape-${i % 3}`;
    b.dataset.key = d.key;
    b.style.setProperty('--c', d.color);
    b.setAttribute('role', 'listitem');
    b.innerHTML = `
      <span class="jar-art" aria-hidden="true">
        <span class="cork"></span>
        <span class="glass"><span class="liquid"></span><span class="shine"></span></span>
      </span>
      <span class="tag">
        <b>No.${pad2(i + 1)}</b>
        <span class="tag-ing">${esc(d.ing)}</span>
        <span class="tag-name">${esc(d.name)}</span>
        <span class="tag-guess"></span>
      </span>`;
    b.addEventListener('click', () => {
      const next = CYCLE[(CYCLE.indexOf(G.g[d.key] ?? null) + 1) % CYCLE.length];
      if (next) G.g[d.key] = next; else delete G.g[d.key];
      G.sealed = false;
      saveGuess(); paintGuess(); sfx.tap(); buzz(6);
    });
    wrap.appendChild(b);
  });
  const pick = $('#attachPick');
  pick.querySelectorAll('label').forEach((l) => l.remove());
  ATTACH_TYPES.forEach((t) => {
    const l = document.createElement('label');
    l.className = 'chip';
    l.innerHTML = `<input type="radio" name="attachGuess" value="${t}"> ${t}`;
    $('input', l).addEventListener('click', (e) => {
      // 같은 것을 다시 누르면 해제
      if (G.attach === t) { e.target.checked = false; G.attach = null; } else G.attach = t;
      G.sealed = false; saveGuess(); paintGuess(); sfx.tap();
    });
    pick.appendChild(l);
  });
}

function paintGuess() {
  document.querySelectorAll('.guess-jar').forEach((b) => {
    const g = G.g[b.dataset.key];
    b.classList.toggle('set', !!g);
    b.style.setProperty('--h', g ? GUESS_H[g] + '%' : '0%');
    $('.tag-guess', b).textContent = g ? TIER_LABEL[g] : '비어 있음';
    const d = ANXIETY.find((x) => x.key === b.dataset.key);
    b.setAttribute('aria-label', `${d.ing}, ${d.name}: ${g ? TIER_LABEL[g] : '짐작 안 함'}. 눌러서 바꾸기`);
  });
  $('#attachPick').querySelectorAll('input').forEach((i) => { i.checked = i.value === G.attach; });
  guessBrew = mixBrew(ANXIETY.filter((d) => G.g[d.key]).map((d) => ({ color: d.color, pct: GUESS_PCT[G.g[d.key]] })));
  setBrewVars($('#pGuess'), guessBrew);
  $('#pGuess').querySelectorAll('.cauldron').forEach((p) => p.style.setProperty('--lv', (guessN() / 12).toFixed(2)));
  $('#guessBrewName').textContent = guessBrew ? `예상: ${colorName(guessBrew)} 물약` : '아직 맹물';
  $('#guessCount').textContent = guessN();
  $('#sealGuess').textContent = G.sealed ? '봉인됨 · 주문서로 가기' : '짐작 봉인하고 주문서 받기';
  const n = guessN();
  $('#guessStatus').innerHTML = n || G.attach
    ? `봉인된 짐작: 재료 <b>${n}/12</b>병${G.attach ? ` · 애착 유형 <b>${esc(G.attach)}</b>` : ''}. 솥에 부을 때 하나씩 대조해 드려요.`
    : '짐작 없이 진행합니다. 대조해 보고 싶다면 <a href="#pGuess">1단계</a>에서 먼저 짐작해 주세요.';
}

$('#sealGuess').addEventListener('click', () => {
  G.sealed = true; saveGuess(); paintGuess();
  sfx.knock();
  toast(guessN() ? `짐작 ${guessN()}병을 봉인했어요. 이제 주문서를 보내세요.` : '짐작 없이 진행해요. 주문서를 보내세요.');
  $('#pOoc').scrollIntoView({ behavior: smooth(), block: 'start' });
});
$('#clearGuess').addEventListener('click', () => {
  G = { g: {}, attach: null, sealed: false }; saveGuess(); paintGuess(); sfx.tap();
});
buildGuessShelf();
paintGuess();

/* ───────── 접수 2·3 ───────── */

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }
}
$('#copyPrompt').addEventListener('click', async () => {
  const ok = await copyText(OOC_PROMPT);
  toast(ok ? '주문서를 베꼈어요. 롤플 채팅에 보내 주세요.' : '복사하지 못했어요. 브라우저 권한을 확인해 주세요.');
});
$('#loadSample').addEventListener('click', () => {
  rxText.value = SAMPLE; npcIn.value = ''; pcIn.value = '';
  start();
});
$('#rxForm').addEventListener('submit', (e) => { e.preventDefault(); start(); });

function start() {
  const msg = $('#formMsg');
  if (!rxText.value.trim()) { msg.textContent = 'AI 답변을 붙여 넣어 주세요.'; rxText.focus(); return; }
  const parsed = parseAnalysis(rxText.value);
  const anxFound = ANXIETY.filter((d) => parsed.items[d.key]).length;
  if (parsed.found < 6 || anxFound < 4) {
    msg.textContent = `재료를 충분히 찾지 못했어요 (찾은 항목 ${parsed.found}개). AI 답변 전체를 붙여 넣었는지 확인해 주세요.`;
    return;
  }
  msg.textContent = '';
  data = parsed;
  npc = npcIn.value.trim() || parsed.npc || 'NPC';
  pc = pcIn.value.trim() || parsed.pc || '';
  if (rxText.value !== SAMPLE) store.set('aa.text', rxText.value);
  G.sealed = true; saveGuess();
  sfx.tap();
  buildRoom();
  $('#intake').hidden = true;
  $('#room').hidden = false;
  window.scrollTo({ top: 0, behavior: smooth() });
}

/* ───────── 실험실 ───────── */
function today() {
  const d = new Date();
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

function buildRoom() {
  // 붙여넣기 순간의 짐작을 고정한다. 수치가 없는 항목의 짐작은 대조할 수 없으니 뺀다.
  const guesses = {};
  for (const [k, v] of Object.entries(G.g)) if (data.items[k]?.pct != null) guesses[k] = v;
  st = { poured: new Set(), opened: new Set(), guesses, attachGuess: G.attach, guessBrew, hits: 0, guessed: 0, dev: new Set(), seal: 'locked', knocks: 0, acc: 0 };
  $('#tNpc').textContent = npc;
  $('#kNpc').textContent = npc;
  $('#tPc').textContent = pc || '—';
  $('#tDate').textContent = today();
  const m = moonPhase();
  $('#tMoon').textContent = m.icon;
  $('#tMoonLabel').textContent = m.label;
  buildShelf();
  buildOrbs();
  resetSeal();
  $('#recipeStep').hidden = true;
  applyBrew();
  updateCounts();
}

/* STEP 1 ─ 재료 선반 */
function buildShelf() {
  const wrap = $('#shelf');
  wrap.innerHTML = '';
  ANXIETY.forEach((d, i) => {
    const it = data.items[d.key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `jar shape-${i % 3}` + (it ? '' : ' empty');
    b.dataset.key = d.key;
    b.style.setProperty('--c', d.color);
    b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', `${pad2(i + 1)}번 재료 ${d.ing}, ${d.name}${it ? ', 아직 넣지 않음' : ', 기록 없음'}`);
    b.innerHTML = `
      <span class="jar-art" aria-hidden="true">
        <span class="cork"></span>
        <span class="glass"><span class="liquid"></span><span class="shine"></span></span>
      </span>
      <span class="tag">
        <b>No.${pad2(i + 1)}</b>
        <span class="tag-ing">${esc(d.ing)}</span>
        <span class="tag-name">${esc(d.name)}</span>
        <span class="tag-pct">${it && it.pct != null ? it.pct + '%' : '—'}</span>
      </span>`;
    if (!it) { st.opened.add(d.key); }
    b.addEventListener('click', () => onJar(d.key));
    wrap.appendChild(b);
  });
}

const jarEl = (key) => $(`#shelf .jar[data-key="${key}"]`);

function onJar(key) {
  const it = data.items[key];
  if (!it) { toast('AI 답변에 이 재료가 없어요.'); return; }
  sfx.tap();
  if (st.poured.has(key)) { showIng(key, false); return; }
  if (jarEl(key).classList.contains('pouring')) return;
  pour(key);
}

function vialHTML(color, h) { return `<span class="vial" style="--c:${color};--h:${h}%"></span>`; }

function flyDrop(fromEl, color, done) {
  const potSvg = $('#pot1 .cauldron');
  if (reduced || !potSvg) { done(); return; }
  const a = fromEl.getBoundingClientRect();
  const b = potSvg.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height * .2;
  const x1 = b.left + b.width / 2, y1 = b.top + b.height * .36;
  const peak = Math.min(y0, y1) - 70;
  const drop = document.createElement('i');
  drop.className = 'drop';
  drop.style.setProperty('--c', color);
  document.body.appendChild(drop);
  const anim = drop.animate([
    { transform: `translate(${x0}px, ${y0}px) scale(.6)` },
    { transform: `translate(${(x0 + x1) / 2}px, ${peak}px) scale(1.1) rotate(-20deg)`, offset: .45 },
    { transform: `translate(${x1}px, ${y1}px) scale(.8)` },
  ], { duration: 700, easing: 'cubic-bezier(.4,.1,.6,1)' });
  anim.onfinish = () => { drop.remove(); done(); };
}

function splash() {
  const svg = $('#pot1 .cauldron');
  svg.classList.remove('splash'); void svg.getBoundingClientRect(); svg.classList.add('splash');
  setTimeout(() => svg.classList.remove('splash'), 800);
}

function pour(key) {
  const it = data.items[key];
  const d = ANXIETY.find((x) => x.key === key);
  const el = jarEl(key);
  const guess = st.guesses[key];
  let hit = null;
  if (guess) {
    st.guessed++;
    hit = tierOf(it.pct) === guess;
    if (hit) st.hits++;
  }
  st.opened.add(key);
  el.classList.add('pouring');
  sfx.cork();
  setTimeout(() => {
    el.classList.add('poured');
    flyDrop($('.jar-art', el), d.color, () => {
      st.poured.add(key);
      splash(); sfx.plop(); buzz(20);
      applyBrew();
      el.classList.remove('pouring');
      el.setAttribute('aria-label', `${d.ing}, ${it.name} ${it.pct ?? ''}%, 솥에 넣음`);
      if (hit != null) {
        const m = document.createElement('span');
        m.className = 'hitmark ' + (hit ? 'hit' : 'miss');
        m.textContent = hit ? '✓' : '✕';
        m.setAttribute('aria-hidden', 'true');
        el.appendChild(m);
        setTimeout(() => (hit ? sfx.hit() : sfx.miss()), 250);
      }
      updateCounts();
      setTimeout(() => showIng(key, true), reduced ? 0 : 450);
    });
  }, reduced ? 0 : 280);
}

function meterHTML(pct, guess, color) {
  if (pct == null) return '';
  const band = guess ? { low: [0, 40], mid: [40, 70], high: [70, 100] }[guess] : null;
  return `
    <div class="meter" role="img" aria-label="${pct}%">
      ${band ? `<span class="meter-band" style="left:${band[0]}%;width:${band[1] - band[0]}%"></span>` : ''}
      <span class="meter-fill" style="${color ? `--c:${color}` : ''}" data-w="${pct}"></span>
    </div>
    <div class="meter-ticks" aria-hidden="true"><span style="left:2%">0</span><span style="left:40%">40</span><span style="left:70%">70</span><span style="left:97%">100</span></div>`;
}

function countUp(el, to) {
  if (reduced) { el.firstChild.nodeValue = to; return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.firstChild.nodeValue = Math.round(to * (1 - (1 - p) ** 3));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function afterOpenSheet() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $('#sheetInner').querySelectorAll('.meter-fill').forEach((f) => { f.style.width = f.dataset.w + '%'; });
  }));
  const pctEl = $('#sheetInner .s-pct[data-to]');
  if (pctEl) countUp(pctEl, +pctEl.dataset.to);
}

function nextJar(after) {
  const keys = ANXIETY.map((d) => d.key);
  const s = keys.indexOf(after);
  for (let k = 1; k <= keys.length; k++) {
    const key = keys[(s + k) % keys.length];
    if (!st.opened.has(key)) return key;
  }
  return null;
}

function showIng(key, fresh) {
  const i = ANXIETY.findIndex((d) => d.key === key);
  const d = ANXIETY[i];
  const it = data.items[key];
  const tier = tierOf(it.pct);
  const guess = st.guesses[key];
  const hit = guess ? tier === guess : null;
  const nxt = nextJar(key);
  openSheet(`
    <div class="sheet-grab"></div>
    <div class="s-top">
      <div class="ing-head">
        ${vialHTML(d.color, it.pct ?? 50)}
        <div>
          <p class="s-no">재료 No.${pad2(i + 1)} · ${esc(d.ing)}</p>
          <h2 class="s-title" id="sheetTitle">${esc(d.name)}</h2>
          ${tier ? `<span class="tier-stamp ${tier}">${TIER_LABEL[tier]}</span>` : ''}
        </div>
      </div>
      ${it.pct != null ? `<p class="s-pct" ${fresh ? `data-to="${it.pct}"` : ''}>${fresh ? 0 : it.pct}<small>%</small></p>` : '<p class="s-pct">—</p>'}
    </div>
    ${meterHTML(it.pct, guess, d.color)}
    ${guess ? `<p class="verdict ${hit ? 'hit' : 'miss'}">내 짐작 <b>${TIER_LABEL[guess]}</b> → 실제 <b>${TIER_LABEL[tier]}</b> · ${hit ? '적중!' : '빗나감'}</p>` : '<p class="verdict none">이 병은 짐작하지 않았어요.</p>'}
    ${it.status ? `<p class="label-sticker" style="--c:${d.color}">${esc(it.status)}</p>` : ''}
    ${it.desc ? `<p class="s-desc-title">재료 감정서</p><p class="s-desc">${esc(it.desc)}</p>` : ''}
    <div class="s-actions">
      <button type="button" class="btn ghost" data-close>닫기</button>
      ${nxt ? '<button type="button" class="btn primary" data-next>다음 병 붓기</button>' : '<button type="button" class="btn primary" data-go="stir">솥 저으러 가기</button>'}
    </div>
  `);
  afterOpenSheet();
  const n = $('[data-next]', $('#sheetInner'));
  if (n) n.addEventListener('click', () => {
    closeSheet();
    jarEl(nxt).scrollIntoView({ block: 'center', behavior: smooth() });
    setTimeout(() => onJar(nxt), reduced ? 0 : 320);
  });
  bindGo();
}

/* STEP 2 ─ 젓기 */
function buildOrbs() {
  const wrap = $('#visions');
  wrap.innerHTML = '';
  HIDDEN.forEach((d, i) => {
    const it = data.items[d.key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'orb' + (it ? '' : ' empty');
    b.dataset.key = d.key;
    b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', `환영 ${pad2(i + 1)} ${d.name}${it ? ', 아직 떠오르지 않음' : ', 기록 없음'}`);
    b.innerHTML = `
      <span class="orb-ball" aria-hidden="true"><svg viewBox="0 0 100 100">${FILM_ICONS[d.key]}</svg></span>
      <span class="orb-name">${esc(d.name)}</span>
      <span class="orb-pct">${it && it.pct != null ? it.pct + '%' : ''}</span>
      <span class="orb-state">${it ? '연기 속에 숨어 있음' : '보이지 않음'}</span>`;
    if (!it) st.dev.add(d.key);
    b.addEventListener('click', () => {
      if (!it) { toast('AI 답변에 이 항목이 없어요.'); return; }
      if (st.dev.has(d.key)) showVision(d.key);
      else toast(stirReady() ? '솥을 저으면 차례로 떠올라요.' : '재료 12병을 먼저 모두 넣어 주세요.');
    });
    wrap.appendChild(b);
  });
}

const stirReady = () => st && st.opened.size >= 12;
const stirPot = $('#stirPot');
const ringFg = $('#ringFg');
const TURN = Math.PI * 2 * 1.15;

function setLadle(a) {
  const hx = 110 + 50 * Math.cos(a), hy = 80 + 8 * Math.sin(a);
  $('#ladleHead').setAttribute('cx', hx.toFixed(1));
  $('#ladleHead').setAttribute('cy', hy.toFixed(1));
  const s = $('#ladleStick');
  s.setAttribute('x1', hx.toFixed(1)); s.setAttribute('y1', hy.toFixed(1));
  s.setAttribute('x2', (hx * .55 + 160 * .45).toFixed(1)); s.setAttribute('y2', '-14');
}
setLadle(0);
function setRing(p) { ringFg.style.strokeDashoffset = String(100 - Math.min(1, p) * 100); }

let stirring = false, lastA = 0, lastSwish = 0;
const angleOf = (e) => {
  const r = stirPot.getBoundingClientRect();
  return Math.atan2((e.clientY - (r.top + r.height * .55)) * 2.2, e.clientX - (r.left + r.width / 2));
};
stirPot.addEventListener('pointerdown', (e) => {
  if (!st) return;
  if (!stirReady()) { toast('재료 12병을 먼저 모두 넣어 주세요.'); return; }
  if (!nextVision()) { toast('모든 환영을 불러냈어요.'); return; }
  stirring = true; lastA = angleOf(e);
  try { stirPot.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
});
stirPot.addEventListener('pointermove', (e) => {
  if (!stirring) return;
  const a = angleOf(e);
  let d = a - lastA;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  lastA = a;
  st.acc += Math.abs(d);
  setLadle(a);
  setRing(st.acc / TURN);
  if (st.acc - lastSwish > .7) { lastSwish = st.acc; sfx.swish(Math.min(1, st.acc / TURN)); buzz(4); }
  if (st.acc >= TURN) { st.acc = 0; lastSwish = 0; setRing(0); summon(); }
});
const endStir = () => { stirring = false; };
stirPot.addEventListener('pointerup', endStir);
stirPot.addEventListener('pointercancel', endStir);
stirPot.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  if (!st) return;
  if (!stirReady()) { toast('재료 12병을 먼저 모두 넣어 주세요.'); return; }
  if (!nextVision()) { toast('모든 환영을 불러냈어요.'); return; }
  const t0 = performance.now();
  const spin = (t) => {
    const p = Math.min(1, (t - t0) / 700);
    setLadle(p * Math.PI * 2); setRing(p);
    if (p < 1) requestAnimationFrame(spin); else { setRing(0); summon(); }
  };
  requestAnimationFrame(spin);
});

function nextVision() { return HIDDEN.find((d) => data.items[d.key] && !st.dev.has(d.key)); }

let summoning = false;
function summon() {
  const d = nextVision();
  if (!d || summoning) return;
  summoning = true;
  stirring = false;
  const rise = $('#visionRise');
  rise.innerHTML = `<svg viewBox="0 0 100 100">${FILM_ICONS[d.key]}</svg>`;
  rise.classList.remove('go'); void rise.offsetWidth; rise.classList.add('go');
  sfx.vision(); buzz(30);
  setTimeout(() => {
    summoning = false;
    st.dev.add(d.key);
    const el = $(`.orb[data-key="${d.key}"]`);
    const it = data.items[d.key];
    el.classList.add('dev');
    $('.orb-state', el).textContent = d.key === 'attach' && it.types?.length ? it.types.join('·') : d.vision;
    el.setAttribute('aria-label', `${d.name} 떠오름. 눌러서 보기`);
    updateCounts();
    showVision(d.key);
  }, reduced ? 0 : 900);
}

function showVision(key) {
  const i = HIDDEN.findIndex((d) => d.key === key);
  const d = HIDDEN[i];
  const it = data.items[key];
  const left = nextVision();
  const quad = key === 'attach'
    ? `<div class="quad" role="img" aria-label="애착 유형: ${esc((it.types || []).join(', ') || it.tag || '판독')}">${ATTACH_TYPES.map((t) => `<span class="${(it.types || []).includes(t) ? 'on' : ''}">${t}</span>`).join('')}</div>`
    : '';
  openSheet(`
    <div class="sheet-grab"></div>
    <div class="s-top">
      <div>
        <p class="s-no">환영 ${pad2(i + 1)} · ${esc(d.vision)}</p>
        <h2 class="s-title" id="sheetTitle">${esc(d.name)}</h2>
        <p class="s-sub">${esc(d.hint)}</p>
      </div>
      ${it.pct != null ? `<p class="s-pct" data-to="${it.pct}">0<small>%</small></p>` : ''}
    </div>
    ${meterHTML(it.pct, null, null)}
    ${quad}
    ${key === 'attach' && st.attachGuess ? `<p class="verdict ${(it.types || []).includes(st.attachGuess) ? 'hit' : 'miss'}">내 짐작 <b>${esc(st.attachGuess)}</b> · ${(it.types || []).includes(st.attachGuess) ? '적중!' : '빗나감'}</p>` : ''}
    ${key === 'attach' && it.tag && !(it.types || []).length ? `<p class="s-hint">${esc(it.tag)}</p>` : ''}
    ${it.status ? `<p class="label-sticker">${esc(it.status)}</p>` : ''}
    ${it.desc ? `<p class="s-desc-title">연기가 보여 준 것</p><p class="s-desc">${esc(it.desc)}</p>` : ''}
    <div class="s-actions">
      <button type="button" class="btn ghost" data-close>${left ? '계속 젓기' : '닫기'}</button>
      ${left ? '' : '<button type="button" class="btn primary" data-go="seal">봉랍 보러 가기</button>'}
    </div>
  `, true);
  afterOpenSheet();
  bindGo();
}

/* STEP 3 ─ 봉랍 */
const sealBox = $('#sealBox');
function resetSeal() {
  sealBox.dataset.state = 'locked';
  sealBox.dataset.hits = '0';
  st.seal = 'locked'; st.knocks = 0;
  $('#tapHint').textContent = '봉랍을 세 번 두드리세요';
  $('#deepTitle').textContent = '';
  $('#deepBody').textContent = '';
  const old = $('#scroll .btn'); if (old) old.remove();
}

function updateCounts() {
  const realPoured = ANXIETY.filter((d) => data.items[d.key] && st.poured.has(d.key)).length;
  $('#openCount').textContent = realPoured;
  $('#hitCount').textContent = st.hits;
  const pills = st.opened.size, films = st.dev.size;
  $('#devCount').textContent = HIDDEN.filter((d) => data.items[d.key] && st.dev.has(d.key)).length;
  $('#lkPills').textContent = pills; $('#lkFilms').textContent = films;
  $('#lkPillBar').style.width = (pills / 12 * 100) + '%';
  $('#lkFilmBar').style.width = (films / 6 * 100) + '%';
  const ready = stirReady();
  stirPot.setAttribute('aria-disabled', String(!ready));
  $('#stirHint').textContent = !ready
    ? `재료 12병을 모두 넣으면 저을 수 있어요. (${pills}/12)`
    : nextVision() ? '솥 안을 빙글빙글 저어 주세요. 초록 고리가 차면 환영이 떠오릅니다.' : '모든 환영을 불러냈어요.';
  if (ready && !st.stirToast) {
    st.stirToast = true;
    setTimeout(() => toast('재료가 모두 들어갔어요. STEP 2에서 솥을 저어 보세요.'), 1400);
  }
  if (st.seal === 'locked' && pills >= 12 && films >= 6) {
    st.seal = 'ready'; sealBox.dataset.state = 'ready';
    setTimeout(() => toast('봉랍이 물러졌어요. STEP 3에서 두드려 깨 보세요.'), 1200);
  }
}

$('#goNext').addEventListener('click', () => {
  const k = ANXIETY.find((d) => !st.opened.has(d.key));
  if (k) { jarEl(k.key).scrollIntoView({ block: 'center', behavior: smooth() }); return; }
  $('#stir').scrollIntoView({ block: 'start', behavior: smooth() });
});

$('#flaskBtn').addEventListener('click', () => {
  if (!st) return;
  if (st.seal === 'locked') { toast('아직 봉랍이 단단해요. 재료와 환영을 모두 확인해 주세요.'); return; }
  if (st.seal !== 'ready') return;
  st.knocks++;
  sealBox.dataset.hits = String(Math.min(2, st.knocks));
  sealBox.classList.remove('knock'); void sealBox.offsetWidth; sealBox.classList.add('knock');
  if (st.knocks < 3) {
    sfx.knock(); buzz(15);
    $('#tapHint').textContent = st.knocks === 1 ? '금이 갔어요. 한 번 더!' : '거의 다 됐어요. 마지막 한 번!';
    return;
  }
  openSeal();
});

function openSeal() {
  st.seal = 'open'; sealBox.dataset.state = 'open';
  sfx.crack(); buzz(50);
  const dp = data.deepest;
  const title = dp ? dp.title : '';
  const body = dp ? dp.body : 'AI 답변에서 가장 깊은 불안을 찾지 못했어요. 답변 끝에 [DEEPEST ANXIETY] 줄을 넣어 다시 받아 보세요.';
  $('#deepTitle').textContent = title ? `“${title}”` : '';
  setTimeout(() => $('#scroll').scrollIntoView({ block: 'nearest', behavior: smooth() }), reduced ? 0 : 900);
  typeText($('#deepBody'), body, () => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn primary';
    btn.style.cssText = 'margin-top:18px;width:100%';
    btn.textContent = '레시피로 기록하기';
    btn.addEventListener('click', () => { btn.remove(); writeRecipe(); });
    $('.scroll-paper').appendChild(btn);
  });
}

function typeText(el, text, done) {
  if (reduced) { el.textContent = text; done(); return; }
  el.textContent = ''; el.classList.add('typing');
  let i = 0, skip = false;
  const chars = [...text];
  const paper = $('.scroll-paper');
  const onSkip = () => { skip = true; };
  paper.addEventListener('click', onSkip, { once: true });
  const tick = () => {
    i = skip ? chars.length : i + 1;
    el.textContent = chars.slice(0, i).join('');
    if (i < chars.length) setTimeout(tick, /[.,!?\n]/.test(chars[i - 1]) ? 180 : 32);
    else { el.classList.remove('typing'); paper.removeEventListener('click', onSkip); done(); }
  };
  setTimeout(tick, 1500);
}

/* STEP 4 ─ 레시피 */
let lastModel = null;
function writeRecipe() {
  lastModel = recipeModel({ data, npc, pc, date: today(), moon: moonPhase(), brew, guessBrew: st.guessBrew, guesses: st.guesses, attachGuess: st.attachGuess, guessed: st.guessed, hits: st.hits });
  const sec = $('#recipeStep');
  sec.hidden = false;
  const r = $('#recipe');
  r.innerHTML = recipeHTML(lastModel);
  r.style.animation = 'none'; void r.offsetWidth; r.style.animation = '';
  sfx.quill();
  sec.scrollIntoView({ behavior: smooth(), block: 'start' });
}

$('#saveImg').addEventListener('click', async () => {
  if (!lastModel) return;
  try { await document.fonts.ready; } catch { /* 무시 */ }
  const c = recipeCanvas(lastModel);
  c.toBlob((blob) => {
    if (!blob) { toast('이미지를 만들지 못했어요.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `potion-recipe-${npc}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('레시피 카드를 저장했어요.');
  }, 'image/png');
});

$('#restart').addEventListener('click', () => {
  $('#room').hidden = true; $('#intake').hidden = false;
  st = null; applyBrew();
  G = { g: {}, attach: null, sealed: false }; saveGuess(); paintGuess();
  rxText.value = ''; store.set('aa.text', '');
  window.scrollTo({ top: 0 });
  toast('새 의뢰예요. 이번에도 먼저 짐작해 보세요.');
});

/* ───────── 시트 ───────── */
const sheet = $('#sheet');
function openSheet(html, smoke = false) {
  sheet.classList.toggle('smoke', smoke);
  $('#sheetInner').innerHTML = html;
  $('#sheetInner').scrollTop = 0;
  if (!sheet.open) { if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', ''); }
  $('[data-close]', $('#sheetInner'))?.addEventListener('click', closeSheet);
}
function closeSheet() { if (sheet.open) { if (sheet.close) sheet.close(); else sheet.removeAttribute('open'); } }
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
function bindGo() {
  $('#sheetInner').querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    closeSheet();
    $('#' + b.dataset.go).scrollIntoView({ behavior: smooth(), block: 'start' });
  }));
}

// 모바일 바텀시트: 아래로 끌어 닫기
(() => {
  let y0 = null;
  const inner = $('#sheetInner');
  inner.addEventListener('touchstart', (e) => { if (inner.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  inner.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    const dy = e.touches[0].clientY - y0;
    if (dy > 0) inner.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  inner.addEventListener('touchend', (e) => {
    if (y0 == null) return;
    const dy = e.changedTouches[0].clientY - y0;
    inner.style.transform = '';
    y0 = null;
    if (dy > 110) closeSheet();
  });
})();
