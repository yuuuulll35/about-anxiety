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
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');
const lastWord = (s) => s.split(' ').pop();

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* 저장 불가 환경 */ } },
};

const stage = $('#stage');
let phase = 'title';
let data = null;    // 파싱 결과
let st = null;      // 실험 상태
let npc = 'NPC';
let pc = '';
let brew = null;

/* ───────── 공통 UI ───────── */
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2400);
}

const cat = $('#cat');
function say(html) {
  $('#catSay').innerHTML = html;
  const box = $('#sayBox'); box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  cat.classList.remove('talk'); void cat.offsetWidth; cat.classList.add('talk');
}

const actBtn = $('#actBtn');
let actFn = null;
function act(label, fn) {
  if (!label) { actBtn.hidden = true; actFn = null; return; }
  actBtn.hidden = false; actBtn.textContent = label; actFn = fn;
}
actBtn.addEventListener('click', () => { sfx.tap(); actFn && actFn(); });

/* 소리 */
const soundBtn = $('#soundBtn');
function paintSound() {
  soundBtn.setAttribute('aria-pressed', String(soundOn()));
  soundBtn.setAttribute('aria-label', soundOn() ? '소리 끄기' : '소리 켜기');
  $('.sound-label', soundBtn).textContent = soundOn() ? '켬' : '끔';
}
soundBtn.addEventListener('click', () => { setSound(!soundOn()); store.set('aa.sound', soundOn() ? '1' : '0'); paintSound(); sfx.tap(); });
if (store.get('aa.sound') === '1') window.addEventListener('pointerdown', () => { setSound(true); paintSound(); }, { once: true });
paintSound();

/* 솥·달 */
$('#pot').innerHTML = cauldronSVG('p', true);
const m = moonPhase();
$('#moon').textContent = m.icon;
$('#moon').parentElement.title = `오늘의 달 · ${m.label}`;

function setBrewVars(target, b) {
  const s = target.style;
  if (b) {
    s.setProperty('--brew', hsl(b.h, b.s, b.l));
    s.setProperty('--brew-l', hsl(b.h, Math.min(1, b.s + .1), Math.min(.8, b.l + .2)));
    s.setProperty('--brew-d', hsl(b.h, b.s, b.l * .5));
  } else ['--brew', '--brew-l', '--brew-d'].forEach((p) => s.removeProperty(p));
}
function setLevel(lv) { $$('#pot .cauldron').forEach((p) => p.style.setProperty('--lv', lv.toFixed(2))); }

/* ───────── 짐작 상태 ───────── */
const npcIn = $('#npcName');
const pcIn = $('#pcName');
const rxText = $('#rxText');
npcIn.value = store.get('aa.npc') || '';
pcIn.value = store.get('aa.pc') || '';
rxText.value = store.get('aa.text') || '';
npcIn.addEventListener('input', () => { store.set('aa.npc', npcIn.value); paintWho(); });
pcIn.addEventListener('input', () => store.set('aa.pc', pcIn.value));

const GUESS_PCT = { low: 20, mid: 55, high: 85 };
const GUESS_H = { low: 24, mid: 55, high: 88 };
const CYCLE = [null, 'low', 'mid', 'high'];
let G = { g: {}, attach: null };
try { G = { ...G, ...JSON.parse(store.get('aa.guess') || '{}') }; } catch { /* 무시 */ }
const saveGuess = () => store.set('aa.guess', JSON.stringify(G));
const guessN = () => Object.keys(G.g).length;
let guessBrew = null;

function paintWho() {
  const n = (st ? npc : npcIn.value.trim());
  $('#who').hidden = !n;
  $('#who').textContent = n ? `${n}의 속마음` : '';
}

/* ───────── 매달린 병 ───────── */
const LEN = [10, 26, 16, 34, 8, 22, 18, 8, 30, 14, 24, 12];
function buildHangs() {
  const wrap = $('#hangs');
  wrap.innerHTML = '';
  ANXIETY.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hang shape-${i % 4}`;
    b.dataset.key = d.key;
    b.setAttribute('role', 'listitem');
    b.style.setProperty('--c', d.color);
    b.style.setProperty('--len', `calc(${LEN[i]}px * var(--bottle) / 60px)`);
    b.style.animationDelay = `${-(i * 0.73) % 4.5}s`;
    b.innerHTML = `
      <span class="bottle" aria-hidden="true"><span class="cork"></span><span class="glass"><span class="liquid"></span><span class="shine"></span></span><span class="q">?</span></span>
      <span class="label">${esc(lastWord(d.ing))}<small></small></span>`;
    b.addEventListener('click', () => onHang(d.key));
    wrap.appendChild(b);
  });
}
const hangEl = (k) => $(`.hang[data-key="${k}"]`);

function paintHangs() {
  ANXIETY.forEach((d) => {
    const el = hangEl(d.key);
    const sm = $('.label small', el);
    if (phase === 'guess' || phase === 'title' || phase === 'paste') {
      const g = G.g[d.key];
      el.classList.toggle('set', !!g);
      el.style.setProperty('--h', g ? GUESS_H[g] + '%' : '0%');
      sm.textContent = g ? TIER_LABEL[g] : (phase === 'guess' ? '?' : '');
      el.setAttribute('aria-label', `${d.ing}, ${d.name}. 나만의 물약 농도 ${g ? TIER_LABEL[g] : '안 정함'}. 눌러서 바꾸기`);
    } else {
      const it = data.items[d.key];
      el.style.setProperty('--h', '70%');
      el.classList.toggle('empty', !it);
      if (st.poured.has(d.key)) sm.textContent = it.pct != null ? it.pct + '%' : '—';
      else sm.textContent = it ? '' : '없음';
      el.setAttribute('aria-label', `${d.ing}, ${d.name}${st.poured.has(d.key) ? `, ${it.pct}% 솥에 넣음` : it ? ', 눌러서 솥에 붓기' : ', 기록 없음'}`);
    }
  });
}

function onHang(key) {
  if (phase === 'title') { toast('먼저 주문서를 펴서 의뢰 대상을 적어 주세요.'); lecternCall(true); return; }
  if (phase === 'guess') {
    const next = CYCLE[(CYCLE.indexOf(G.g[key] ?? null) + 1) % CYCLE.length];
    if (next) G.g[key] = next; else delete G.g[key];
    saveGuess(); paintGuess(); sfx.tap(); buzz(6);
    return;
  }
  if (phase === 'paste') { toast('나만의 물약은 완성됐어요. 주문서를 펴서 진짜 레시피(AI 답변)를 넣어 주세요.'); lecternCall(true); return; }
  // 실험 중
  const it = data.items[key];
  if (!it) { toast('AI 답변에 이 재료가 없어요.'); return; }
  if (st.poured.has(key)) { showIng(key, false); return; }
  if (phase !== 'brew' || st.busy) return;
  pour(key);
}

/* ───────── 짐작 ───────── */
function paintGuess() {
  paintHangs();
  guessBrew = mixBrew(ANXIETY.filter((d) => G.g[d.key]).map((d) => ({ color: d.color, pct: GUESS_PCT[G.g[d.key]] })));
  $('#vialGuess').style.setProperty('--v', guessBrew ? hsl(guessBrew.h, guessBrew.s, guessBrew.l) : 'transparent');
  if (phase === 'guess' || phase === 'title' || phase === 'paste') {
    setBrewVars(document.documentElement, guessBrew);
    setLevel(guessN() / 12);
    $('#brewText').textContent = guessBrew ? `나만의 · ${colorName(guessBrew)}` : '맹물';
  }
  const n = guessN();
  $('#guessStatus').innerHTML = n || G.attach
    ? `나만의 물약: 재료 <b>${n}/12</b>병${G.attach ? ` · 애착 유형 <b>${esc(G.attach)}</b>` : ''}. 진짜 물약을 끓일 때 하나씩 비교해 드려요.`
    : '나만의 물약 없이 진행해요. 비교 없이 진짜 물약만 끓여요.';
  if (phase === 'guess') act(n ? `나만의 물약 완성 (${n}/12)` : '나만의 물약 완성', sealGuess);
}

function askAttach() {
  say(`나만의 물약 완성이다냥! 하나만 더, <b>${esc(npc || 'NPC')}</b>의 애착 유형은 뭘 것 같아?
    <span class="chips">${ATTACH_TYPES.map((t) => `<button type="button" data-at="${t}" class="${G.attach === t ? 'on' : ''}">${t}</button>`).join('')}<button type="button" data-at="">모르겠어</button></span>`);
  $$('#catSay [data-at]').forEach((b) => b.addEventListener('click', () => {
    G.attach = b.dataset.at || null; saveGuess(); sfx.tap();
    setPhase('paste');
    openBook('ooc');
  }));
}

function sealGuess() {
  sfx.knock(); buzz(12);
  store.set('aa.phase', 'paste');
  act(null);
  askAttach();
}

/* ───────── 단계 ───────── */
function lecternCall(on) { $('#bookBtn').classList.toggle('call', on); }

function setPhase(p) {
  phase = p;
  stage.dataset.phase = p;
  if (['title', 'guess', 'paste'].includes(p)) store.set('aa.phase', p);
  lecternCall(p === 'title' || p === 'paste' || p === 'done');
  $('#flaskBtn').hidden = p !== 'seal';
  paintRibbons();
  switch (p) {
    case 'title':
      say('어서 와, 의뢰인. 오늘은 누구의 속마음을 끓여 볼까냥? <b>주문서</b>를 펴 봐.');
      act('주문서 펴기', () => openBook('name'));
      break;
    case 'guess':
      say(`나만의 물약부터 만들어 보자냥. 병 12개는 <b>${esc(npc)}</b>의 불안 12가지야. 네 감으로 병을 눌러 농도를 정해 봐. 누를 때마다 <b>옅음 → 보통 → 진함 → 빼기</b>.`);
      paintGuess();
      break;
    case 'paste':
      say('주문서를 펴서 <b>주문(OOC)</b>을 채팅에 외우고, 받아 온 답변을 <b>재료</b> 장에 넣어 줘.');
      act('주문서 펴기', () => openBook(rxText.value.trim() ? 'paste' : 'ooc'));
      paintGuess();
      break;
    case 'brew':
      say(st.guessed || Object.keys(st.guesses).length ? '진짜 레시피가 들어왔다냥. 병을 솥에 부을 때마다 나만의 물약이랑 비교해 줄게.' : '재료가 준비됐다냥. 병을 하나씩 눌러 솥에 부어 봐.');
      act(null);
      break;
    case 'stir':
      say('재료가 다 들어갔어! 이제 <b>솥 안을 빙글빙글</b> 저어 봐. 초록 고리가 차면 연기 속에서 뭔가 떠오를 거야.');
      act(null);
      break;
    case 'seal':
      say('솥에서 마지막 병이 떠올랐다냥… 본인도 인정하기 싫은 게 들었어. <b>봉랍을 세 번</b> 두드려 봐.');
      act(null);
      break;
    case 'done':
      say(`완성이다냥! 레시피는 주문서 마지막 장에 적어 뒀어. ${st.guessed ? `나만의 물약은 진짜와 <b>${st.hits}/${st.guessed}</b>병 같았어.` : ''}`);
      act('레시피 보기', () => openBook('recipe'));
      break;
  }
}

/* ───────── 주문서(책) ───────── */
const book = $('#book');
function paintRibbons() {
  const brewing = !['title', 'guess', 'paste'].includes(phase);
  $$('.ribbons button').forEach((b) => {
    const pg = b.dataset.page;
    b.disabled = brewing && pg !== 'recipe';
  });
}
function openBook(page) {
  showPage(page);
  if (!book.open) book.showModal();
  sfx.cork();
}
function showPage(page) {
  $$('.page', book).forEach((p) => p.classList.toggle('on', p.dataset.page === page));
  $$('.ribbons button').forEach((b) => b.setAttribute('aria-current', b.dataset.page === page ? 'page' : 'false'));
  book.querySelector('.book-inner').scrollTop = 0;
}
$$('.ribbons button').forEach((b) => b.addEventListener('click', () => { showPage(b.dataset.page); sfx.tap(); }));
$$('[data-goto]').forEach((b) => b.addEventListener('click', () => showPage(b.dataset.goto)));
$('[data-book-close]').addEventListener('click', () => book.close());
book.addEventListener('click', (e) => { if (e.target === book) book.close(); });
$('#bookBtn').addEventListener('click', () => {
  if (phase === 'title') openBook('name');
  else if (phase === 'guess') openBook('name');
  else if (phase === 'paste') openBook(rxText.value.trim() ? 'paste' : 'ooc');
  else openBook('recipe');
});

$('#goGuess').addEventListener('click', () => {
  npc = npcIn.value.trim() || 'NPC'; paintWho();
  book.close(); setPhase('guess');
});
$('#skipGuess').addEventListener('click', () => {
  npc = npcIn.value.trim() || 'NPC'; paintWho();
  G = { g: {}, attach: null }; saveGuess();
  setPhase('paste'); showPage('ooc');
});

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    book.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }
}
$('#copyPrompt').addEventListener('click', async () => {
  const ok = await copyText(OOC_PROMPT);
  if (phase === 'title' || phase === 'guess') setPhase('paste');
  toast(ok ? '주문서를 복사했어요. 롤플 채팅에 보내 주세요.' : '복사하지 못했어요. 브라우저 권한을 확인해 주세요.');
});
$('#loadSample').addEventListener('click', () => { rxText.value = SAMPLE; startBrew(true); });
$('#brewBtn').addEventListener('click', () => startBrew(false));

function startBrew(isSample) {
  const msg = $('#formMsg');
  if (!rxText.value.trim()) { msg.textContent = 'AI 답변을 붙여 넣어 주세요.'; rxText.focus(); return; }
  const parsed = parseAnalysis(rxText.value);
  const anxFound = ANXIETY.filter((d) => parsed.items[d.key]).length;
  if (parsed.found < 6 || anxFound < 4) { msg.textContent = `재료를 충분히 찾지 못했어요 (찾은 항목 ${parsed.found}개). 답변 전체를 붙여 넣었는지 확인해 주세요.`; return; }
  msg.textContent = '';
  data = parsed;
  npc = npcIn.value.trim() || parsed.npc || 'NPC';
  pc = pcIn.value.trim() || parsed.pc || '';
  if (!isSample) store.set('aa.text', rxText.value);
  // 붙여넣는 순간 짐작을 고정한다
  const guesses = {};
  for (const [k, v] of Object.entries(G.g)) if (data.items[k]?.pct != null) guesses[k] = v;
  st = { poured: new Set(), guesses, attachGuess: G.attach, guessBrew, hits: 0, guessed: 0, dev: new Set(), knocks: 0, acc: 0, busy: false };
  ANXIETY.forEach((d) => { if (!data.items[d.key]) st.poured.add(d.key); });
  HIDDEN.forEach((d) => { if (!data.items[d.key]) st.dev.add(d.key); });
  $('#kNpc').textContent = npc;
  paintWho();
  book.close();
  // 솥을 비우고 시작
  $$('.hang').forEach((h) => { h.classList.remove('poured', 'set', 'empty'); $('.mark', h)?.remove(); });
  brew = null; setBrewVars(document.documentElement, null); setLevel(0);
  $('#brewText').textContent = '맹물';
  $('#vialReal').style.setProperty('--v', 'transparent');
  $('#recipe').innerHTML = '<p class="pg-note">아직 완성된 물약이 없어요.</p>';
  buildTracks();
  setPhase('brew');
  paintHangs();
  sfx.plop();
}

/* ───────── HUD ───────── */
function buildTracks() {
  $('#trackDrops').innerHTML = ANXIETY.map((d) => `<i data-k="${d.key}" style="--c:${d.color}" title="${esc(d.ing)}"></i>`).join('');
  $('#trackStars').innerHTML = HIDDEN.map((d) => `<i data-k="${d.key}" title="${esc(d.name)}"></i>`).join('');
  $('#trackSeal i').classList.remove('on');
  ANXIETY.forEach((d) => { if (!data.items[d.key]) $(`#trackDrops [data-k="${d.key}"]`).classList.add('on'); });
}

function applyBrew() {
  const parts = ANXIETY.filter((d) => st.poured.has(d.key) && data.items[d.key]).map((d) => ({ color: d.color, pct: data.items[d.key].pct }));
  brew = mixBrew(parts);
  setBrewVars(document.documentElement, brew);
  setLevel(st.poured.size / 12);
  $('#brewText').textContent = brew ? `${colorName(brew)} 물약` : '맹물';
  $('#vialReal').style.setProperty('--v', brew ? hsl(brew.h, brew.s, brew.l) : 'transparent');
}

/* ───────── 붓기 ───────── */
function flyBottle(el, done) {
  const src = $('.bottle', el);
  const potSvg = $('#pot .cauldron');
  if (reduced) { done(); return; }
  const a = src.getBoundingClientRect();
  const b = potSvg.getBoundingClientRect();
  const clone = src.cloneNode(true);
  const fly = document.createElement('div');
  fly.className = 'fly-bottle';
  fly.style.setProperty('--c', el.style.getPropertyValue('--c'));
  fly.style.setProperty('--h', '70%');
  fly.style.width = a.width + 'px'; fly.style.height = a.height + 'px';
  clone.style.cssText = `width:${a.width}px;height:${a.height}px`;
  fly.className += ' ' + [...el.classList].find((c) => c.startsWith('shape-'));
  fly.appendChild(clone);
  document.body.appendChild(fly);
  el.classList.add('flying');
  const x0 = a.left, y0 = a.top;
  const x1 = b.left + b.width / 2 - a.width / 2, y1 = b.top + b.height * .12 - a.height / 2;
  const anim = fly.animate([
    { transform: `translate(${x0}px, ${y0}px) rotate(0deg)` },
    { transform: `translate(${(x0 + x1) / 2}px, ${Math.min(y0, y1) - 40}px) rotate(-60deg)`, offset: .45 },
    { transform: `translate(${x1}px, ${y1}px) rotate(-130deg)`, offset: .75 },
    { transform: `translate(${x1}px, ${y1 - 10}px) rotate(-150deg)`, opacity: 0 },
  ], { duration: 950, easing: 'cubic-bezier(.4,.1,.5,1)' });
  setTimeout(() => { sfx.plop(); splash(); buzz(20); }, 700);
  anim.onfinish = () => { fly.remove(); el.classList.remove('flying'); done(); };
}

function splash() {
  const svg = $('#pot .cauldron');
  svg.classList.remove('splash'); void svg.getBoundingClientRect(); svg.classList.add('splash');
  setTimeout(() => svg.classList.remove('splash'), 800);
}

function pour(key) {
  const it = data.items[key];
  const d = ANXIETY.find((x) => x.key === key);
  const el = hangEl(key);
  const guess = st.guesses[key];
  let hit = null;
  if (guess) { st.guessed++; hit = tierOf(it.pct) === guess; if (hit) st.hits++; }
  st.busy = true;
  sfx.cork();
  flyBottle(el, () => {
    if (reduced) { sfx.plop(); }
    st.poured.add(key);
    el.classList.add('poured');
    applyBrew();
    const slot = $(`#trackDrops [data-k="${key}"]`);
    slot.classList.add('on'); if (hit != null) slot.classList.add(hit ? 'hit' : 'miss');
    if (hit != null) {
      const mk = document.createElement('span');
      mk.className = 'mark ' + (hit ? 'hit' : 'miss'); mk.textContent = hit ? '✓' : '✕'; mk.setAttribute('aria-hidden', 'true');
      el.appendChild(mk);
      setTimeout(() => (hit ? sfx.hit() : sfx.miss()), 200);
    }
    paintHangs();
    st.busy = false;
    showIng(key, true);
  });
}

/* ───────── 카드(시트) ───────── */
const sheet = $('#sheet');
let afterSheet = null;
function openSheet(html, smoke = false, onClose = null) {
  sheet.classList.toggle('smoke', smoke);
  $('#sheetInner').innerHTML = html;
  $('#sheetInner').scrollTop = 0;
  afterSheet = onClose;
  if (!sheet.open) sheet.showModal();
  $$('[data-close]', $('#sheetInner')).forEach((b) => b.addEventListener('click', closeSheet));
  requestAnimationFrame(() => requestAnimationFrame(() => $$('#sheetInner .meter-fill').forEach((f) => { f.style.width = f.dataset.w + '%'; })));
  const pctEl = $('#sheetInner .s-pct[data-to]');
  if (pctEl) countUp(pctEl, +pctEl.dataset.to);
}
function closeSheet() { if (sheet.open) sheet.close(); }
sheet.addEventListener('close', () => { const f = afterSheet; afterSheet = null; f && f(); });
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

function countUp(el, to) {
  if (reduced) { el.firstChild.nodeValue = to; return; }
  const t0 = performance.now();
  const step = (t) => { const p = Math.min(1, (t - t0) / 900); el.firstChild.nodeValue = Math.round(to * (1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
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
const vialHTML = (color, h) => `<span class="vial" style="--c:${color};--h:${h}%"></span>`;

function showIng(key, fresh) {
  const i = ANXIETY.findIndex((d) => d.key === key);
  const d = ANXIETY[i];
  const it = data.items[key];
  const tier = tierOf(it.pct);
  const guess = st.guesses[key];
  const hit = guess ? tier === guess : null;
  const left = ANXIETY.filter((x) => !st.poured.has(x.key)).length;
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
    ${guess ? `<p class="verdict ${hit ? 'hit' : 'miss'}">나만의 물약 <b>${TIER_LABEL[guess]}</b> → 진짜 <b>${TIER_LABEL[tier]}</b> · ${hit ? '똑같다!' : '달랐다'}</p>` : ''}
    ${it.status ? `<p class="label-sticker" style="--c:${d.color}">${esc(it.status)}</p>` : ''}
    ${it.desc ? `<p class="s-desc-title">재료 감정서</p><p class="s-desc">${esc(it.desc)}</p>` : ''}
    <div class="s-actions"><button type="button" class="btn primary" data-close>${fresh && left ? `계속 붓기 (${left}병 남음)` : '닫기'}</button></div>
  `, false, () => { if (phase === 'brew' && !ANXIETY.some((x) => !st.poured.has(x.key))) setPhase('stir'); });
}

/* ───────── 젓기 ───────── */
const pot = $('#pot');
const ringFg = $('#ringFg');
const TURN = Math.PI * 2 * 1.15;
function setLadle(a) {
  const hx = 110 + 50 * Math.cos(a), hy = 80 + 8 * Math.sin(a);
  const h = $('#ladleHead'), s = $('#ladleStick');
  h.setAttribute('cx', hx.toFixed(1)); h.setAttribute('cy', hy.toFixed(1));
  s.setAttribute('x1', hx.toFixed(1)); s.setAttribute('y1', hy.toFixed(1));
  s.setAttribute('x2', (hx * .55 + 160 * .45).toFixed(1)); s.setAttribute('y2', '-14');
}
setLadle(0);
const setRing = (p) => { ringFg.style.strokeDashoffset = String(100 - Math.min(1, p) * 100); };
const nextVision = () => HIDDEN.find((d) => data.items[d.key] && !st.dev.has(d.key));

let stirring = false, lastA = 0, lastSwish = 0, summoning = false;
const angleOf = (e) => { const r = pot.getBoundingClientRect(); return Math.atan2((e.clientY - (r.top + r.height * .45)) * 2.2, e.clientX - (r.left + r.width / 2)); };
pot.addEventListener('pointerdown', (e) => {
  if (phase === 'brew') { toast('재료를 모두 부은 뒤에 저을 수 있어요.'); return; }
  if (phase !== 'stir' || summoning) return;
  stirring = true; lastA = angleOf(e);
  try { pot.setPointerCapture(e.pointerId); } catch { /* 무시 */ }
});
pot.addEventListener('pointermove', (e) => {
  if (!stirring) return;
  const a = angleOf(e);
  let d = a - lastA;
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  lastA = a; st.acc += Math.abs(d);
  setLadle(a); setRing(st.acc / TURN);
  if (st.acc - lastSwish > .7) { lastSwish = st.acc; sfx.swish(Math.min(1, st.acc / TURN)); buzz(4); }
  if (st.acc >= TURN) { st.acc = 0; lastSwish = 0; setRing(0); summon(); }
});
const endStir = () => { stirring = false; };
pot.addEventListener('pointerup', endStir);
pot.addEventListener('pointercancel', endStir);
pot.addEventListener('keydown', (e) => {
  if ((e.key !== 'Enter' && e.key !== ' ') || phase !== 'stir' || summoning) return;
  e.preventDefault();
  const t0 = performance.now();
  const spin = (t) => { const p = Math.min(1, (t - t0) / 700); setLadle(p * Math.PI * 2); setRing(p); if (p < 1) requestAnimationFrame(spin); else { setRing(0); summon(); } };
  requestAnimationFrame(spin);
});

function summon() {
  const d = nextVision();
  if (!d || summoning) return;
  summoning = true; stirring = false;
  const rise = $('#visionRise');
  rise.innerHTML = `<svg viewBox="0 0 100 100">${FILM_ICONS[d.key]}</svg>`;
  rise.classList.remove('go'); void rise.offsetWidth; rise.classList.add('go');
  sfx.vision(); buzz(30);
  setTimeout(() => {
    summoning = false;
    st.dev.add(d.key);
    $(`#trackStars [data-k="${d.key}"]`).classList.add('on');
    showVision(d.key);
  }, reduced ? 0 : 900);
}

function showVision(key) {
  const i = HIDDEN.findIndex((d) => d.key === key);
  const d = HIDDEN[i];
  const it = data.items[key];
  const left = HIDDEN.filter((x) => !st.dev.has(x.key)).length;
  const quad = key === 'attach'
    ? `<div class="quad" role="img" aria-label="애착 유형: ${esc((it.types || []).join(', ') || it.tag || '판독')}">${ATTACH_TYPES.map((t) => `<span class="${(it.types || []).includes(t) ? 'on' : ''}">${t}</span>`).join('')}</div>`
    : '';
  const ag = st.attachGuess;
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
    ${key === 'attach' && ag ? `<p class="verdict ${(it.types || []).includes(ag) ? 'hit' : 'miss'}">나만의 물약 <b>${esc(ag)}</b> · ${(it.types || []).includes(ag) ? '똑같다!' : '달랐다'}</p>` : ''}
    ${key === 'attach' && it.tag && !(it.types || []).length ? `<p class="s-hint">${esc(it.tag)}</p>` : ''}
    ${it.status ? `<p class="label-sticker">${esc(it.status)}</p>` : ''}
    ${it.desc ? `<p class="s-desc-title">연기가 보여 준 것</p><p class="s-desc">${esc(it.desc)}</p>` : ''}
    <div class="s-actions"><button type="button" class="btn primary" data-close>${left ? `계속 젓기 (${left}개 남음)` : '닫기'}</button></div>
  `, true, () => { if (phase === 'stir' && !nextVision()) setPhase('seal'); });
}

/* ───────── 봉랍 ───────── */
const flaskBtn = $('#flaskBtn');
flaskBtn.addEventListener('click', () => {
  if (phase !== 'seal') return;
  st.knocks++;
  flaskBtn.dataset.hits = String(Math.min(2, st.knocks));
  flaskBtn.classList.remove('knock'); void flaskBtn.offsetWidth; flaskBtn.classList.add('knock');
  if (st.knocks < 3) {
    sfx.knock(); buzz(15);
    say(st.knocks === 1 ? '금이 갔다냥! 한 번 더.' : '거의 다 됐어… 마지막 한 번!');
    return;
  }
  flaskBtn.classList.add('open');
  sfx.crack(); buzz(50);
  $('#trackSeal i').classList.add('on');
  setTimeout(openScroll, reduced ? 0 : 700);
});

const scrollDlg = $('#scrollDlg');
function openScroll() {
  const dp = data.deepest;
  $('#deepTitle').textContent = dp && dp.title ? `“${dp.title}”` : '';
  $('#toRecipe').hidden = true;
  scrollDlg.showModal();
  typeText($('#deepBody'), dp ? dp.body : 'AI 답변에서 가장 깊은 불안을 찾지 못했어요. 답변 끝에 [DEEPEST ANXIETY] 줄을 넣어 다시 받아 보세요.', () => { $('#toRecipe').hidden = false; });
}
$('#toRecipe').addEventListener('click', () => { scrollDlg.close(); });
scrollDlg.addEventListener('close', () => {
  if (phase !== 'seal') return;
  writeRecipe();
  setPhase('done');
  openBook('recipe');
});

function typeText(el, text, done) {
  if (reduced) { el.textContent = text; done(); return; }
  el.textContent = ''; el.classList.add('typing');
  let i = 0, skip = false;
  const paper = $('.scroll-paper');
  const chars = [...text];
  const onSkip = () => { skip = true; };
  paper.addEventListener('click', onSkip, { once: true });
  const tick = () => {
    i = skip ? chars.length : i + 1;
    el.textContent = chars.slice(0, i).join('');
    if (i < chars.length) setTimeout(tick, /[.,!?\n]/.test(chars[i - 1]) ? 180 : 32);
    else { el.classList.remove('typing'); paper.removeEventListener('click', onSkip); done(); }
  };
  setTimeout(tick, 1100);
}

/* ───────── 레시피 ───────── */
let lastModel = null;
function today() { const d = new Date(); return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`; }
function writeRecipe() {
  lastModel = recipeModel({ data, npc, pc, date: today(), moon: moonPhase(), brew, guessBrew: st.guessBrew, guesses: st.guesses, attachGuess: st.attachGuess, guessed: st.guessed, hits: st.hits });
  $('#recipe').innerHTML = recipeHTML(lastModel);
  sfx.quill();
}
$('#saveImg').addEventListener('click', async () => {
  if (!lastModel) { toast('아직 완성된 물약이 없어요.'); return; }
  try { await document.fonts.ready; } catch { /* 무시 */ }
  recipeCanvas(lastModel).toBlob((blob) => {
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
  book.close();
  data = null; st = null; lastModel = null;
  G = { g: {}, attach: null }; saveGuess();
  rxText.value = ''; store.set('aa.text', '');
  $$('.hang').forEach((h) => { h.classList.remove('poured', 'set', 'empty'); $('.mark', h)?.remove(); });
  $('#trackDrops').innerHTML = ''; $('#trackStars').innerHTML = ''; $('#trackSeal i').classList.remove('on');
  flaskBtn.classList.remove('open', 'knock'); flaskBtn.dataset.hits = '0';
  $('#vialReal').style.setProperty('--v', 'transparent');
  setPhase('title');
  paintGuess(); paintWho();
});

/* 바텀시트 끌어 닫기 */
(() => {
  let y0 = null;
  const inner = $('#sheetInner');
  inner.addEventListener('touchstart', (e) => { if (inner.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  inner.addEventListener('touchmove', (e) => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) inner.style.transform = `translateY(${dy}px)`; }, { passive: true });
  inner.addEventListener('touchend', (e) => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; inner.style.transform = ''; y0 = null; if (dy > 110) closeSheet(); });
})();

/* ───────── 시작 ───────── */
buildHangs();
const saved = store.get('aa.phase');
npc = npcIn.value.trim() || 'NPC';
paintWho();
setPhase(saved === 'guess' || saved === 'paste' ? saved : 'title');
paintGuess();
