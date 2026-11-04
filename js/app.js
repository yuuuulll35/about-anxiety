import { ANXIETY, HIDDEN, ATTACH_TYPES, tierOf, TIER_LABEL } from './items.js';
import { parseAnalysis } from './parse.js';
import { SAMPLE } from './sample.js';
import { OOC_PROMPT } from './prompt.js';
import { FILM_ICONS } from './icons.js';
import { receiptModel, receiptHTML, receiptCanvas } from './receipt.js';
import { setSound, soundOn, sfx, buzz } from './sound.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

let data = null;
let st = null;
let npc = 'NPC';
let pc = '';

/* ───────── 토스트 ───────── */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
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
if (store.get('aa.sound') === '1') { /* 오디오는 첫 사용자 동작 이후에만 켠다 */
  window.addEventListener('pointerdown', function once() { setSound(true); paintSound(); window.removeEventListener('pointerdown', once); }, { once: true });
}
paintSound();

/* ───────── 접수 ───────── */
const rxText = $('#rxText');
const npcIn = $('#npcName');
const pcIn = $('#pcName');
rxText.value = store.get('aa.text') || '';
npcIn.value = store.get('aa.npc') || '';
pcIn.value = store.get('aa.pc') || '';

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
  toast(ok ? 'OOC 프롬프트를 복사했어요. 롤플 채팅에 보내 주세요.' : '복사하지 못했어요. 브라우저 권한을 확인해 주세요.');
});
$('#loadSample').addEventListener('click', () => {
  rxText.value = SAMPLE; npcIn.value = ''; pcIn.value = '';
  start();
});
$('#rxForm').addEventListener('submit', (e) => { e.preventDefault(); start(); });

function start() {
  const msg = $('#formMsg');
  const parsed = parseAnalysis(rxText.value);
  const anxFound = ANXIETY.filter((d) => parsed.items[d.key]).length;
  if (!rxText.value.trim()) { msg.textContent = 'AI 답변을 붙여 넣어 주세요.'; rxText.focus(); return; }
  if (parsed.found < 6 || anxFound < 4) {
    msg.textContent = `항목을 충분히 찾지 못했어요 (찾은 항목 ${parsed.found}개). AI 답변 전체를 붙여 넣었는지 확인해 주세요.`;
    return;
  }
  msg.textContent = '';
  data = parsed;
  npc = npcIn.value.trim() || parsed.npc || 'NPC';
  pc = pcIn.value.trim() || parsed.pc || '';
  if (rxText.value !== SAMPLE) {
    store.set('aa.text', rxText.value); store.set('aa.npc', npcIn.value); store.set('aa.pc', pcIn.value);
  }
  sfx.tap();
  buildRoom();
  $('#intake').hidden = true;
  $('#room').hidden = false;
  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}

/* ───────── 조제실 ───────── */
function today() {
  const d = new Date();
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

function buildRoom() {
  st = { opened: new Set(), guesses: {}, hits: 0, guessed: 0, dev: new Set(), light: false, state: 'locked' };
  $('#tNpc').textContent = npc;
  $('#kNpc').textContent = npc;
  $('#tPc').textContent = pc || '—';
  $('#tDate').textContent = today();
  buildBlister();
  buildFilms();
  resetSeal();
  $('#receiptStep').hidden = true;
  setLight(false);
  updateCounts();
}

/* STEP 1 ─ 블리스터 */
function buildBlister() {
  const wrap = $('#blister');
  wrap.innerHTML = '';
  ANXIETY.forEach((d, i) => {
    const it = data.items[d.key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell' + (it ? '' : ' empty');
    b.dataset.key = d.key;
    b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', `${pad2(i + 1)}번 ${d.name}${it ? ', 아직 뜯지 않음' : ', 기록 없음'}`);
    const tier = it ? tierOf(it.pct) : null;
    const scale = it && it.pct != null ? (0.78 + it.pct / 100 * 0.4).toFixed(2) : 1;
    b.innerHTML = `
      <span class="bubble">
        <span class="inside">
          <span class="pill ${tier || 'mid'}" style="--s:${scale}"></span>
          <span class="inside-pct">${it && it.pct != null ? it.pct + '%' : '—'}</span>
          <span class="inside-name">${esc(d.name)}</span>
        </span>
        <span class="foil">
          <span class="foil-no">No.${pad2(i + 1)}</span>
          <span class="foil-name">${esc(d.name.replace(/ ?(불안도|염려도)$/, ''))}</span>
          <span class="foil-press">${it ? 'PRESS' : '기록 없음'}</span>
        </span>
      </span>`;
    if (!it) st.opened.add(d.key);
    b.addEventListener('click', () => onCell(d.key));
    wrap.appendChild(b);
  });
}

function cellEl(key) { return $(`.cell[data-key="${key}"]`); }

function onCell(key) {
  const it = data.items[key];
  if (!it) { toast('AI 답변에 이 항목이 없어요.'); return; }
  sfx.tap();
  if (cellEl(key).classList.contains('open')) { showPill(key, false); return; }
  if ($('#guessToggle').checked && it.pct != null) showGuess(key);
  else tear(key, null);
}

function showGuess(key) {
  const i = ANXIETY.findIndex((d) => d.key === key);
  const d = ANXIETY[i];
  openSheet(`
    <div class="sheet-grab"></div>
    <p class="s-no">No.${pad2(i + 1)} · 의식 아래 불안</p>
    <h2 class="s-title" id="sheetTitle">${esc(d.name)}</h2>
    <p class="s-hint">${esc(d.hint)}</p>
    <p class="s-q">${esc(npc)}의 이 불안, 얼마나 될까요?</p>
    <div class="guess">
      ${['low', 'mid', 'high'].map((t) => `
        <button type="button" data-tier="${t}"><span class="pill ${t}"></span>${TIER_LABEL[t]}<small>${{ low: '0–39', mid: '40–69', high: '70–100' }[t]}</small></button>`).join('')}
    </div>
    <button type="button" class="s-skip" data-skip>짐작 없이 그냥 뜯기</button>
  `);
  $('#sheetInner').querySelectorAll('[data-tier]').forEach((btn) =>
    btn.addEventListener('click', () => { closeSheet(); tear(key, btn.dataset.tier); }));
  $('[data-skip]', $('#sheetInner')).addEventListener('click', () => { closeSheet(); tear(key, null); });
}

function shards(el) {
  if (reduced) return;
  const r = el.getBoundingClientRect();
  const host = el;
  for (let k = 0; k < 7; k++) {
    const s = document.createElement('i');
    s.className = 'shard';
    s.style.left = (r.width / 2 - 4) + 'px';
    s.style.top = (r.height / 2 - 3) + 'px';
    s.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
    s.style.setProperty('--dy', (Math.random() * 90 - 20) + 'px');
    s.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg');
    host.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }
}

function tear(key, guess) {
  const it = data.items[key];
  const el = cellEl(key);
  st.opened.add(key);
  let hit = null;
  if (guess && it.pct != null) {
    st.guesses[key] = guess;
    st.guessed++;
    hit = tierOf(it.pct) === guess;
    if (hit) st.hits++;
  }
  el.classList.add('open');
  el.setAttribute('aria-label', `${it.name} ${it.pct ?? ''}%, 열림`);
  sfx.pop(); buzz(18);
  shards(el);
  if (hit != null) {
    const m = document.createElement('span');
    m.className = 'hitmark ' + (hit ? 'hit' : 'miss');
    m.textContent = hit ? '✓' : '✕';
    m.setAttribute('aria-hidden', 'true');
    el.appendChild(m);
  }
  updateCounts();
  setTimeout(() => {
    el.classList.add('opened');
    if (hit === true) sfx.hit(); else if (hit === false) sfx.miss();
    showPill(key, true);
  }, reduced ? 0 : 620);
}

function meterHTML(pct, tier, guess) {
  if (pct == null) return '';
  const band = guess ? { low: [0, 40], mid: [40, 70], high: [70, 100] }[guess] : null;
  return `
    <div class="meter" role="img" aria-label="${pct}%">
      ${band ? `<span class="meter-band" style="left:${band[0]}%;width:${band[1] - band[0]}%"></span>` : ''}
      <span class="meter-fill ${tier}" data-w="${pct}"></span>
    </div>
    <div class="meter-ticks" aria-hidden="true"><span style="left:2%">0</span><span style="left:40%">40</span><span style="left:70%">70</span><span style="left:97%">100</span></div>`;
}

function countUp(el, to) {
  if (!el) return;
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

function nextUnopened(after) {
  const keys = ANXIETY.map((d) => d.key);
  const start = keys.indexOf(after);
  for (let k = 1; k <= keys.length; k++) {
    const key = keys[(start + k) % keys.length];
    if (!st.opened.has(key)) return key;
  }
  return null;
}

function showPill(key, fresh) {
  const i = ANXIETY.findIndex((d) => d.key === key);
  const d = ANXIETY[i];
  const it = data.items[key];
  const tier = tierOf(it.pct);
  const guess = st.guesses[key];
  const hit = guess ? tierOf(it.pct) === guess : null;
  const nxt = nextUnopened(key);
  openSheet(`
    <div class="sheet-grab"></div>
    <p class="s-no">No.${pad2(i + 1)} · 의식 아래 불안</p>
    <div class="s-top">
      <div>
        <h2 class="s-title" id="sheetTitle">${esc(d.name)}</h2>
        ${tier ? `<span class="tier-stamp ${tier}">${TIER_LABEL[tier]}</span>` : ''}
      </div>
      <p class="s-pct" ${it.pct != null ? `data-to="${it.pct}"` : ''}>${it.pct != null ? (fresh ? 0 : it.pct) : '—'}<small>%</small></p>
    </div>
    ${meterHTML(it.pct, tier, guess)}
    ${guess && fresh ? `<p class="verdict ${hit ? 'hit' : 'miss'}">${hit ? `적중! ${TIER_LABEL[guess]}으로 짐작했어요.` : `빗나감. ${TIER_LABEL[guess]}으로 짐작했어요.`}</p>` : ''}
    ${it.status ? `<p class="label-sticker">${esc(it.status)}</p>` : ''}
    ${it.desc ? `<p class="s-desc-title">해설</p><p class="s-desc">${esc(it.desc)}</p>` : ''}
    <div class="s-actions">
      <button type="button" class="btn ghost" data-close>닫기</button>
      ${nxt ? `<button type="button" class="btn primary" data-next>다음 칸 뜯기</button>` : `<button type="button" class="btn primary" data-go="xray">엑스레이실로</button>`}
    </div>
  `);
  if (!fresh) { const p = $('#sheetInner .s-pct'); if (p) p.removeAttribute('data-to'); }
  afterOpenSheet();
  const n = $('[data-next]', $('#sheetInner'));
  if (n) n.addEventListener('click', () => { closeSheet(); cellEl(nxt).scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); setTimeout(() => onCell(nxt), reduced ? 0 : 280); });
  bindGo();
}

/* STEP 2 ─ 엑스레이 */
const HOLD_MS = 1100;

function buildFilms() {
  const wrap = $('#films');
  wrap.innerHTML = '';
  HIDDEN.forEach((d, i) => {
    const it = data.items[d.key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'film' + (it ? '' : ' empty');
    b.dataset.key = d.key;
    b.setAttribute('role', 'listitem');
    b.setAttribute('aria-label', `필름 ${pad2(i + 1)} ${d.name}${it ? ', 길게 눌러 현상' : ', 기록 없음'}`);
    b.innerHTML = `
      <span class="film-tag">FILM ${pad2(i + 1)} · R</span>
      <svg class="film-svg" viewBox="0 0 100 100" aria-hidden="true">${FILM_ICONS[d.key]}</svg>
      <span class="film-name">${esc(d.name)}</span>
      <span class="film-pct">${it && it.pct != null ? it.pct + '%' : ''}</span>
      <span class="film-state">${it ? '길게 눌러 현상' : '판독 불가'}</span>
      <span class="film-ring" aria-hidden="true"></span>`;
    if (!it) st.dev.add(d.key);
    else bindHold(b, d.key);
    wrap.appendChild(b);
  });
}

function setLight(on) {
  st.light = on;
  const sw = $('#lightSwitch');
  sw.setAttribute('aria-checked', String(on));
  $('b', sw).textContent = on ? 'ON' : 'OFF';
  $('#lightbox').classList.toggle('on', on);
}
$('#lightSwitch').addEventListener('click', () => { setLight(!st.light); sfx.click(); buzz(8); });

function needLight() {
  toast('먼저 라이트박스를 켜 주세요.');
  const sw = $('#lightSwitch');
  if (!reduced) sw.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
  sw.focus({ preventScroll: true });
}

function bindHold(el, key) {
  let raf = 0, t0 = 0, wasDev = false, active = false;
  const stop = (cancel) => {
    cancelAnimationFrame(raf); active = false;
    sfx.stopHum();
    el.classList.remove('holding');
    if (cancel) el.style.setProperty('--p', 0);
  };
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => {
    if (e.button && e.button !== 0) return;
    wasDev = st.dev.has(key);
    if (wasDev) return;
    if (!st.light) { needLight(); return; }
    active = true; t0 = performance.now();
    el.classList.add('holding');
    try { el.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
    sfx.startHum();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / HOLD_MS);
      el.style.setProperty('--p', p.toFixed(3));
      sfx.setHum(p);
      if (p >= 1) { stop(false); develop(key); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  });
  const end = () => {
    if (active) { stop(true); $('.film-state', el).textContent = '조금 더 길게!'; }
    else if (wasDev) { wasDev = false; showFilm(key); }
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', () => { if (active) stop(true); wasDev = false; });
  // 키보드(Enter/Space)는 click(detail 0)으로 들어온다: 바로 현상
  el.addEventListener('click', (e) => {
    if (e.detail !== 0) return;
    if (st.dev.has(key)) { showFilm(key); return; }
    if (!st.light) { needLight(); return; }
    develop(key);
  });
}

function develop(key) {
  const el = $(`.film[data-key="${key}"]`);
  const it = data.items[key];
  st.dev.add(key);
  el.classList.add('dev');
  el.style.setProperty('--p', 1);
  const st8 = key === 'attach' && it.types && it.types.length ? it.types.join('·') : '판독 완료 · 다시 눌러 보기';
  $('.film-state', el).textContent = st8;
  el.setAttribute('aria-label', `${it.name} 현상됨. 눌러서 판독 소견 보기`);
  sfx.dev(); buzz(30);
  updateCounts();
  setTimeout(() => showFilm(key), reduced ? 0 : 380);
}

function nextFilm(after) {
  const keys = HIDDEN.map((d) => d.key);
  const start = keys.indexOf(after);
  for (let k = 1; k <= keys.length; k++) {
    const key = keys[(start + k) % keys.length];
    if (!st.dev.has(key)) return key;
  }
  return null;
}

function showFilm(key) {
  const i = HIDDEN.findIndex((d) => d.key === key);
  const d = HIDDEN[i];
  const it = data.items[key];
  const nxt = nextFilm(key);
  const quad = key === 'attach'
    ? `<div class="quad" role="img" aria-label="애착 유형: ${esc((it.types || []).join(', ') || it.tag || '판독')}">${ATTACH_TYPES.map((t) => `<span class="${(it.types || []).includes(t) ? 'on' : ''}">${t}</span>`).join('')}</div>`
    : '';
  openSheet(`
    <div class="sheet-grab"></div>
    <p class="s-no">FILM ${pad2(i + 1)} · 판독 소견서</p>
    <div class="s-top">
      <div>
        <h2 class="s-title" id="sheetTitle">${esc(d.name)}</h2>
        <p class="s-hint" style="margin:0">${esc(d.hint)}</p>
      </div>
      ${it.pct != null ? `<p class="s-pct" data-to="${it.pct}">0<small>%</small></p>` : ''}
    </div>
    ${meterHTML(it.pct, tierOf(it.pct), null)}
    ${quad}
    ${key === 'attach' && it.tag && !(it.types || []).length ? `<p class="s-hint" style="margin-top:10px">${esc(it.tag)}</p>` : ''}
    ${it.status ? `<p class="label-sticker">${esc(it.status)}</p>` : ''}
    ${it.desc ? `<p class="s-desc-title">소견</p><p class="s-desc">${esc(it.desc)}</p>` : ''}
    <div class="s-actions">
      <button type="button" class="btn ghost" data-close>닫기</button>
      ${nxt ? '' : `<button type="button" class="btn primary" data-go="seal">봉투 보러 가기</button>`}
    </div>
  `, true);
  afterOpenSheet();
  bindGo();
}

/* STEP 3 ─ 봉인 */
const kraft = $('#kraft');
const strip = $('#tearStrip');
const tab = $('#tearTab');
let tearT = 0;

function resetSeal() {
  kraft.dataset.state = 'locked';
  st.state = 'locked';
  tearT = 0; strip.style.setProperty('--t', 0);
  $('#deepTitle').textContent = '';
  $('#deepBody').textContent = '';
  const old = $('#letter .btn'); if (old) old.remove();
}

function updateCounts() {
  const realOpened = ANXIETY.filter((d) => data.items[d.key] && st.opened.has(d.key)).length;
  $('#openCount').textContent = realOpened;
  $('#hitCount').textContent = st.hits;
  const pills = st.opened.size, films = st.dev.size;
  $('#devCount').textContent = HIDDEN.filter((d) => data.items[d.key] && st.dev.has(d.key)).length;
  $('#lkPills').textContent = pills; $('#lkFilms').textContent = films;
  $('#lkPillBar').style.width = (pills / 12 * 100) + '%';
  $('#lkFilmBar').style.width = (films / 6 * 100) + '%';
  if (st.state === 'locked' && pills >= 12 && films >= 6) {
    st.state = 'ready'; kraft.dataset.state = 'ready';
    setTimeout(() => toast('봉인이 풀렸습니다. STEP 3 봉투를 뜯어 보세요.'), 900);
  }
}

$('#goNext').addEventListener('click', () => {
  const k = ANXIETY.find((d) => !st.opened.has(d.key));
  if (k) { cellEl(k.key).scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); return; }
  const f = HIDDEN.find((d) => !st.dev.has(d.key));
  if (f) $(`.film[data-key="${f.key}"]`).scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
});

let dragging = false, lastTick = 0;
function setT(t) { tearT = Math.max(0, Math.min(1, t)); strip.style.setProperty('--t', tearT.toFixed(3)); }
tab.addEventListener('pointerdown', (e) => {
  if (st.state !== 'ready') return;
  dragging = true; tab.setPointerCapture(e.pointerId); e.preventDefault();
});
tab.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const r = strip.getBoundingClientRect();
  setT((e.clientX - r.left - 26) / (r.width - 52));
  const tick = Math.floor(tearT * 14);
  if (tick > lastTick) { sfx.tear(tearT); buzz(4); }
  lastTick = tick;
});
const release = () => {
  if (!dragging) return;
  dragging = false;
  if (tearT > .85) { setT(1); openSeal(); return; }
  // 덜 뜯으면 제자리로
  const from = tearT, t0 = performance.now();
  const back = (t) => { const p = Math.min(1, (t - t0) / 250); setT(from * (1 - p)); if (p < 1) requestAnimationFrame(back); };
  requestAnimationFrame(back); lastTick = 0;
};
tab.addEventListener('pointerup', release);
tab.addEventListener('pointercancel', release);
tab.addEventListener('click', (e) => {
  if (e.detail !== 0 || st.state !== 'ready') return; // 키보드만
  const t0 = performance.now();
  const go = (t) => { const p = Math.min(1, (t - t0) / 500); setT(p); if (p < 1) requestAnimationFrame(go); else openSeal(); };
  requestAnimationFrame(go);
});

function openSeal() {
  if (st.state === 'torn') return;
  st.state = 'torn'; kraft.dataset.state = 'torn';
  sfx.pop(); buzz(40);
  const dp = data.deepest;
  const title = dp ? dp.title : '';
  const body = dp ? dp.body : 'AI 답변에서 가장 깊은 불안을 찾지 못했어요. 답변 끝에 [DEEPEST ANXIETY] 줄을 넣어 다시 받아 보세요.';
  $('#deepTitle').textContent = title ? `“${title}”` : '';
  typeText($('#deepBody'), body, () => {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'btn primary';
    btn.style.cssText = 'margin-top:16px;width:100%;font-family:var(--f-body)';
    btn.textContent = '조제 내역서 출력';
    btn.addEventListener('click', () => { btn.remove(); printReceipt(); });
    $('#letter').appendChild(btn);
  });
}

function typeText(el, text, done) {
  if (reduced) { el.textContent = text; done(); return; }
  el.textContent = ''; el.classList.add('typing');
  let i = 0, skip = false;
  const chars = [...text];
  const onSkip = () => { skip = true; };
  $('#letter').addEventListener('click', onSkip, { once: true });
  const tick = () => {
    if (skip) i = chars.length; else i += 1;
    el.textContent = chars.slice(0, i).join('');
    if (i < chars.length) setTimeout(tick, /[.,!?。\n]/.test(chars[i - 1]) ? 180 : 32);
    else { el.classList.remove('typing'); $('#letter').removeEventListener('click', onSkip); done(); }
  };
  setTimeout(tick, 600);
}

/* STEP 4 ─ 내역서 */
let lastModel = null;
function printReceipt() {
  lastModel = receiptModel({ data, npc, pc, date: today(), guessed: st.guessed, hits: st.hits });
  const sec = $('#receiptStep');
  sec.hidden = false;
  const r = $('#receipt');
  r.innerHTML = receiptHTML(lastModel);
  r.style.animation = 'none'; void r.offsetWidth; r.style.animation = '';
  sfx.print();
  sec.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
}

$('#saveImg').addEventListener('click', async () => {
  if (!lastModel) return;
  try { await document.fonts.ready; } catch { /* 무시 */ }
  const c = receiptCanvas(lastModel);
  c.toBlob((blob) => {
    if (!blob) { toast('이미지를 만들지 못했어요.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `속마음조제실_${npc}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('내역서 이미지를 저장했어요.');
  }, 'image/png');
});

$('#restart').addEventListener('click', () => {
  $('#room').hidden = true; $('#intake').hidden = false;
  window.scrollTo({ top: 0 });
  rxText.focus({ preventScroll: true });
});

/* ───────── 시트 ───────── */
const sheet = $('#sheet');
function openSheet(html, dark = false) {
  sheet.classList.toggle('dark', dark);
  $('#sheetInner').innerHTML = html;
  $('#sheetInner').scrollTop = 0;
  if (!sheet.open) { if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', ''); }
  $('[data-close]', $('#sheetInner'))?.addEventListener('click', closeSheet);
}
function closeSheet() { if (sheet.open) { if (sheet.close) sheet.close(); else sheet.removeAttribute('open'); } }
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); }); // 바깥 누르면 닫기
function bindGo() {
  $('#sheetInner').querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
    closeSheet();
    $('#' + b.dataset.go).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
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
    const dy = (e.changedTouches[0].clientY - y0);
    inner.style.transform = '';
    y0 = null;
    if (dy > 110) closeSheet();
  });
})();
