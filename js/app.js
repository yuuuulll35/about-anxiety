import { ANXIETY, HIDDEN, ATTACH_TYPES, tierOf, TIER_LABEL } from './items.js';
import { parseAnalysis } from './parse.js';
import { SAMPLE } from './sample.js';
import { OOC_PROMPT } from './prompt.js';
import { FILM_ICONS } from './icons.js';
import { cauldronSVG } from './cauldron.js';
import { mixBrew, colorName, hsl, moonPhase, josa } from './brew.js';
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
  requestAnimationFrame(avoidCat);
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

/* ───────── 의뢰 정보 · 나만의 물약 상태 ───────── */
let draftText = store.get('aa.text') || '';
npc = store.get('aa.npc') || '';
pc = store.get('aa.pc') || '';

const GUESS_PCT = { low: 20, mid: 55, high: 85 };
const GUESS_H = { low: 24, mid: 55, high: 88 };
let G = { g: {}, attach: null };
try { G = { ...G, ...JSON.parse(store.get('aa.guess') || '{}') }; } catch { /* 무시 */ }
const saveGuess = () => store.set('aa.guess', JSON.stringify(G));
const guessN = () => Object.keys(G.g).length;
let guessBrew = null;
let step = 'intro'; // 준비 단계: intro → name → pc → guess → attach → ooc → paste
let introAt = 0;
let curGuess = null; // 지금 묻고 있는 병

function paintWho() {
  $('#who').hidden = !npc;
  $('#who').textContent = npc ? `${npc}의 속마음` : '';
}

/* 고양이 대화창 + 그 아래 입력 한 줄 */
function ask(text, formHtml = '', bind = null) {
  say(text);
  const f = $('#sayForm');
  f.innerHTML = formHtml;
  f.hidden = !formHtml;
  if (bind) bind(f);
}

function goStep(s) {
  step = s;
  store.set('aa.step', s);
  store.set('aa.stepAt', String(Date.now()));
  stage.dataset.step = s;
  $$('.hang.coach').forEach((h) => h.classList.remove('coach'));
  stage.dataset.focus = '';
  act(null);
  switch (s) {
    case 'intro':
      setPhase('title');
      introAt = 0;
      introLine();
      break;
    case 'name': {
      setPhase('title');
      ask('그럼 시작하자! 오늘은 <b>누구의 속마음</b>을 끓일까냥?',
        `<div class="say-row"><input id="fNpc" maxlength="20" placeholder="NPC 이름" autocomplete="off" enterkeyhint="next"><button class="mini primary" id="fNext" type="button" disabled>다음</button></div>
         <button class="link-btn" type="button" id="fSample">예시로 먼저 구경하기</button>`,
        (f) => {
          const inp = $('#fNpc', f), nx = $('#fNext', f);
          const ok = () => { nx.disabled = !inp.value.trim(); };
          inp.addEventListener('input', ok);
          const go = () => { if (!inp.value.trim()) return; npc = inp.value.trim(); store.set('aa.npc', npc); paintWho(); sfx.tap(); goStep('pc'); };
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
          nx.addEventListener('click', go);
          $('#fSample', f).addEventListener('click', runSample);
          if (!matchMedia('(pointer: coarse)').matches) inp.focus({ preventScroll: true });
        });
      break;
    }
    case 'pc': {
      setPhase('title');
      ask(`<b>${esc(npc)}</b>, 좋아. 그럼 너는? <small class="say-sub">${esc(npc)}의 상대(PC) 이름</small>`,
        `<div class="say-row"><input id="fPc" maxlength="20" placeholder="PC 이름 (선택)" autocomplete="off" enterkeyhint="next"><button class="mini primary" id="fNext" type="button">건너뛰기</button></div>`,
        (f) => {
          const inp = $('#fPc', f), nx = $('#fNext', f);
          inp.addEventListener('input', () => { nx.textContent = inp.value.trim() ? '다음' : '건너뛰기'; });
          const go = () => { pc = inp.value.trim(); store.set('aa.pc', pc); sfx.tap(); goStep('guess'); };
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
          nx.addEventListener('click', go);
          if (!matchMedia('(pointer: coarse)').matches) inp.focus({ preventScroll: true });
        });
      break;
    }
    case 'guess':
      setPhase('guess');
      curGuess = null;
      guessIntro();
      break;
    case 'attach':
      setPhase('guess');
      ask('하나만 더! 애착 유형은?',
        `<div class="chips">${ATTACH_TYPES.map((t) => `<button type="button" data-at="${t}" class="${G.attach === t ? 'on' : ''}">${t}</button>`).join('')}<button type="button" data-at="" class="ghost">모르겠어</button></div>`,
        (f) => $$('[data-at]', f).forEach((b) => b.addEventListener('click', () => {
          G.attach = b.dataset.at || null; saveGuess(); sfx.knock(); buzz(10); goStep('ooc');
        })));
      break;
    case 'ooc':
      setPhase('paste');
      ask(guessN() ? '나만의 물약 완성! 이제 <b>진짜 레시피</b>를 받아 오자.' : '<b>진짜 레시피</b>를 받아 오자.',
        `<button class="mini primary wide" id="fCopy" type="button">📋 주문 복사하기</button>
         <p class="say-hint">복사해서 롤플 채팅에 보내면 돼.</p>`,
        (f) => $('#fCopy', f).addEventListener('click', async () => {
          const ok = await copyText(OOC_PROMPT);
          if (!ok) { toast('복사하지 못했어요. 주문서 메뉴에서 다시 시도해 주세요.'); return; }
          store.set('aa.copied', '1'); sfx.cork(); buzz(10);
          goStep('paste');
        }));
      break;
    case 'paste':
      setPhase('paste');
      ask('AI 답변을 받아 왔어?',
        `<div class="say-row"><button class="mini primary" id="fClip" type="button">📥 붙여넣기</button><button class="mini" id="fRecopy" type="button">주문 다시 복사</button></div>
         <textarea id="fText" rows="2" placeholder="또는 여기에 붙여넣기 · MUL- 로 시작하는 블록" spellcheck="false">${esc(draftText)}</textarea>
         <p class="check" id="fCheck" aria-live="polite"></p>
         <button class="mini go wide" id="fBrew" type="button" disabled>솥에 불 지피기</button>`,
        (f) => {
          const ta = $('#fText', f);
          const update = () => { draftText = ta.value; store.set('aa.text', draftText); checkPaste(f); };
          ta.addEventListener('input', update);
          $('#fClip', f).addEventListener('click', async () => {
            try {
              const t = await navigator.clipboard.readText();
              if (!t.trim()) throw new Error('empty');
              ta.value = t; update(); sfx.plop();
            } catch { toast('붙여넣기 권한이 없어요. 아래 칸에 직접 붙여 넣어 주세요.'); ta.focus(); }
          });
          $('#fRecopy', f).addEventListener('click', async () => { if (await copyText(OOC_PROMPT)) toast('주문을 다시 복사했어요.'); });
          $('#fBrew', f).addEventListener('click', () => startBrew(draftText, false));
          checkPaste(f);
        });
      break;
  }
}

/* 붙여 넣는 즉시 읽어서 보여 준다 */
function checkPaste(f) {
  const out = $('#fCheck', f), btn = $('#fBrew', f);
  const t = draftText.trim();
  if (!t) { out.innerHTML = ''; btn.disabled = true; return; }
  const r = parseAnalysis(t);
  const mark = (n, max) => `<span class="${n === max ? 'ok' : n ? 'part' : 'no'}">${n}/${max}</span>`;
  const deep = `마지막 한 방울 <span class="${r.deepest ? 'ok' : 'no'}">${r.deepest ? '✓' : '—'}</span>`;
  let ok, html;
  if (r.error) {
    ok = false;
    html = '<span class="no">물약 코드가 깨졌어. 코드 줄(MUL-…)을 다시 복사해 줘.</span>';
  } else if (r.code) {
    ok = true;
    html = `물약 코드 <span class="ok">✓</span> · 상태값 ${mark(r.lines, 18)} · ${deep}`
      + (r.fuzzy ? `<br><span class="part">코드 ${r.fuzzy}칸이 흐려서 그 재료는 보통으로 읽을게.</span>` : '');
  } else {
    const a = ANXIETY.filter((d) => r.items[d.key]).length;
    const h = HIDDEN.filter((d) => r.items[d.key]).length;
    ok = r.found >= 6 && a >= 4;
    html = `재료 ${mark(a, 12)} · 환영 ${mark(h, 6)} · ${deep}`
      + (ok ? '' : '<br><span class="no">물약 코드(MUL-…)가 든 블록을 통째로 넣어 줘.</span>');
  }
  out.innerHTML = html;
  btn.disabled = !ok;
  btn.classList.toggle('ready', ok);
}

/* 튜토리얼: 한 줄씩, 말하는 대상을 비춘다 */
const INTRO = [
  { t: '어서 와, 의뢰인! 여긴 <b>마녀의 속마음 실험실</b>. 나는 조수 고양이 <b>먹물</b>이다냥.' },
  { t: '여기선 캐릭터의 <b>속마음</b>을 물약으로 끓여. 천장에 매달린 <b>병 12개</b>가 마음속 불안 12가지야.', f: 'rack' },
  { t: '먼저 네 감으로 병마다 농도를 골라 <b>나만의 물약</b>을 만들어 봐. 정답은 없어!', f: 'rack' },
  { t: '그다음 <b>주문서</b>의 주문(OOC)을 롤플 채팅에 보내면, AI가 <b>진짜 레시피</b>를 알려 줘.', f: 'book' },
  { t: '받아 온 레시피로 이 솥에 <b>진짜 물약</b>을 끓이면, 네 물약과 얼마나 같은지 보여 줄게.', f: 'pot' },
];
function introLine() {
  const L = INTRO[introAt];
  stage.dataset.focus = L.f || '';
  const last = introAt === INTRO.length - 1;
  ask(`${L.t}`,
    `<div class="say-row end"><span class="dots">${INTRO.map((_, i) => `<i class="${i === introAt ? 'on' : ''}"></i>`).join('')}</span>
       <button class="link-btn" type="button" id="fSkipIntro">${last ? '' : '설명 건너뛰기'}</button>
       <button class="mini primary" id="fNext" type="button">${last ? '좋아, 시작!' : '다음 ▸'}</button></div>`,
    (f) => {
      const next = () => { sfx.tap(); if (last) goStep('name'); else { introAt++; introLine(); } };
      $('#fNext', f).addEventListener('click', next);
      const sk = $('#fSkipIntro', f); if (last) sk.remove(); else sk.addEventListener('click', () => goStep('name'));
      $('#fNext', f).focus({ preventScroll: true });
    });
}

const P = () => pc || '상대';
function qText(d) {
  const p = P();
  return d.q.replace('{P가}', josa(p, '이', '가')).replace('{P를}', josa(p, '을', '를')).replace('{P에게}', p + '에게');
}

function guessIntro() {
  const n = guessN();
  ask(n ? `이어서 골라 볼까? 병을 누르면 무슨 마음인지 알려 줄게.` : `이제 <b>나만의 물약</b>을 만들 차례. 병을 하나 눌러 봐. 무슨 마음인지 알려 줄게.`,
    '<button class="link-btn" type="button" id="fSkip">건너뛰고 진짜 레시피 받기</button>',
    (f) => $('#fSkip', f).addEventListener('click', () => { G = { g: {}, attach: null }; saveGuess(); paintGuess(); goStep('ooc'); }));
  const first = ANXIETY.find((d) => !G.g[d.key]) || ANXIETY[0];
  hangEl(first.key).classList.add('coach');
  guessAct();
}

function guessAct() {
  const n = guessN();
  act(n >= 12 ? '나만의 물약 완성!' : n ? `여기까지 완성 (${n}/12)` : null, () => goStep('attach'));
}

function guessAsk(key) {
  curGuess = key;
  $$('.hang.coach').forEach((h) => h.classList.remove('coach'));
  $$('.hang.asking').forEach((h) => h.classList.remove('asking'));
  hangEl(key).classList.add('asking');
  const d = ANXIETY.find((x) => x.key === key);
  const i = ANXIETY.indexOf(d);
  const cur = G.g[key];
  ask(`<span class="q-tag">${pad2(i + 1)} · ${esc(d.short)} <small>${guessN()}/12</small></span><b>${esc(qText(d))}</b>, ${esc(josa(npc, '은', '는'))} 얼마나 클까?`,
    `<div class="chips three">${['low', 'mid', 'high'].map((t) => `<button type="button" data-t="${t}" class="${cur === t ? 'on' : ''}"><span class="lvl ${t}"></span>${TIER_LABEL[t]}</button>`).join('')}</div>`,
    (f) => $$('[data-t]', f).forEach((b) => b.addEventListener('click', () => {
      G.g[key] = b.dataset.t; saveGuess(); paintGuess(); sfx.plop(); buzz(8);
      const next = ANXIETY.slice(i + 1).concat(ANXIETY.slice(0, i)).find((x) => !G.g[x.key]);
      guessAct();
      if (next) setTimeout(() => guessAsk(next.key), reduced ? 0 : 260);
      else {
        $$('.hang.asking').forEach((h) => h.classList.remove('asking'));
        ask('12병 다 골랐다냥! 아래 <b>완성</b>을 눌러 줘. 바꾸고 싶은 병은 다시 눌러도 돼.');
      }
    })));
}

function onHang(key) {
  if (phase === 'title') { toast(step === 'intro' ? '먹물의 설명을 먼저 들어 줘.' : '먼저 이름부터 알려 줘.'); return; }
  if (phase === 'guess') {
    if (step !== 'guess') { step = 'guess'; store.set('aa.step', 'guess'); }
    sfx.tap();
    guessAsk(key);
    return;
  }
  if (phase === 'paste') { toast('나만의 물약은 다 만들었어. 이제 AI 답변을 넣어 줘.'); return; }
  const it = data.items[key];
  if (!it) { toast('AI 답변에 이 재료가 없어요.'); return; }
  if (st.poured.has(key)) { showIng(key, false); return; }
  if (phase !== 'brew' || st.busy) return;
  pour(key);
}

function paintGuess() {
  paintHangs();
  guessBrew = mixBrew(ANXIETY.filter((d) => G.g[d.key]).map((d) => ({ color: d.color, pct: GUESS_PCT[G.g[d.key]] })));
  $('#vialGuess').style.setProperty('--v', guessBrew ? hsl(guessBrew.h, guessBrew.s, guessBrew.l) : 'transparent');
  if (['title', 'guess', 'paste'].includes(phase)) {
    setBrewVars(document.documentElement, guessBrew);
    setLevel(guessN() / 12);
    $('#brewText').textContent = guessBrew ? `나만의 · ${colorName(guessBrew)}` : '맹물';
  }
}

/* ───────── 단계 ───────── */
function lecternCall(on) { $('#bookBtn').classList.toggle('call', on); }

function setPhase(p) {
  phase = p;
  stage.dataset.phase = p;
  lecternCall(p === 'done');
  $('#flaskBtn').hidden = p !== 'seal';
  if (!['title', 'guess', 'paste'].includes(p)) { $('#sayForm').hidden = true; $('#sayForm').innerHTML = ''; }
  switch (p) {
    case 'brew':
      say(Object.keys(st.guesses).length ? '진짜 레시피 도착! <b>병을 톡</b> 눌러 솥에 부어 봐.' : '<b>병을 톡</b> 눌러 솥에 부어 봐.');
      act(null);
      hangEl(ANXIETY.find((d) => !st.poured.has(d.key))?.key ?? ANXIETY[0].key).classList.add('coach');
      break;
    case 'stir':
      say('이제 <b>솥 안을 빙글빙글</b> 저어 봐!');
      act(null);
      break;
    case 'seal':
      say('마지막 병이 떠올랐어. <b>봉랍을 톡톡톡</b>!');
      act(null);
      break;
    case 'done':
      say(`완성이다냥!${st.guessed ? ` 나만의 물약은 진짜와 <b>${st.hits}/${st.guessed}</b>병 같았어.` : ''}`);
      act('레시피 보기', () => openBook('recipe'));
      break;
  }
}

/* ───────── 주문서(책): 레시피 · 메뉴 ───────── */
const book = $('#book');
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
$('[data-book-close]').addEventListener('click', () => book.close());
book.addEventListener('click', (e) => { if (e.target === book) book.close(); });
$('#bookBtn').addEventListener('click', () => openBook(lastModel ? 'recipe' : 'menu'));

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    (book.open ? book : document.body).appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove(); return ok;
  }
}
$('#copyPrompt').addEventListener('click', async () => {
  toast((await copyText(OOC_PROMPT)) ? '주문(OOC)을 복사했어요.' : '복사하지 못했어요. 브라우저 권한을 확인해 주세요.');
});
function runSample() {
  if (!npc) npc = '';
  startBrew(SAMPLE, true);
}
$('#loadSample').addEventListener('click', () => { book.close(); runSample(); });

function startBrew(text, isSample) {
  const parsed = parseAnalysis(text);
  const anxFound = ANXIETY.filter((d) => parsed.items[d.key]).length;
  if (parsed.error || parsed.found < 6 || anxFound < 4) { toast(parsed.error ? '물약 코드가 깨졌어요. 코드 줄을 다시 복사해 주세요.' : '재료를 충분히 찾지 못했어요. 답변 전체를 붙여 넣어 주세요.'); return; }
  data = parsed;
  const useNpc = isSample ? (parsed.npc || '서도윤') : (npc || parsed.npc || 'NPC');
  const usePc = isSample ? (parsed.pc || '유하') : (pc || parsed.pc || '');
  npc = useNpc; pc = usePc;
  // 붙여넣는 순간 나만의 물약을 고정한다
  const guesses = {};
  for (const [k, v] of Object.entries(G.g)) if (data.items[k]?.pct != null) guesses[k] = v;
  st = { poured: new Set(), guesses, attachGuess: G.attach, guessBrew, hits: 0, guessed: 0, dev: new Set(), knocks: 0, acc: 0, busy: false };
  ANXIETY.forEach((d) => { if (!data.items[d.key]) st.poured.add(d.key); });
  HIDDEN.forEach((d) => { if (!data.items[d.key]) st.dev.add(d.key); });
  $('#kNpc').textContent = npc;
  paintWho();
  if (book.open) book.close();
  $$('.hang').forEach((h) => { h.classList.remove('poured', 'set', 'empty', 'coach'); $('.mark', h)?.remove(); });
  brew = null; setBrewVars(document.documentElement, null); setLevel(0);
  $('#brewText').textContent = '맹물';
  $('#vialReal').style.setProperty('--v', 'transparent');
  $('#recipe').innerHTML = '<p class="pg-note">아직 완성된 물약이 없어요.</p>';
  buildTracks();
  store.set('aa.step', 'paste');
  setPhase('brew');
  paintHangs();
  sfx.plop();
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
      <span class="label">${esc(d.short)}<small></small></span>`;
    b.addEventListener('click', () => onHang(d.key));
    wrap.appendChild(b);
  });
}
const hangEl = (k) => $(`.hang[data-key="${k}"]`);

function paintHangs() {
  ANXIETY.forEach((d) => {
    const el = hangEl(d.key);
    const sm = $('.label small', el);
    if (!st) {
      const g = G.g[d.key];
      el.classList.toggle('set', !!g);
      el.style.setProperty('--h', g ? GUESS_H[g] + '%' : '0%');
      sm.textContent = g ? TIER_LABEL[g] : '';
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
  const x1 = b.left + b.width / 2 - a.width / 2, y1 = b.top + b.height * .3 - a.height / 2;
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
    $$('.hang.coach').forEach((h) => h.classList.remove('coach'));
    const nx = ANXIETY.find((d) => !st.poured.has(d.key));
    if (nx) hangEl(nx.key).classList.add('coach');
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
    ${it.uncertain ? '<p class="s-hint">코드가 흐려서 보통(4단계)으로 읽었어.</p>' : ''}
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
  const hx = 200 + 108 * Math.cos(a), hy = 140 + 50 * Math.sin(a);
  const h = $('#ladleHead'), s = $('#ladleStick');
  h.setAttribute('cx', hx.toFixed(1)); h.setAttribute('cy', hy.toFixed(1));
  s.setAttribute('x1', hx.toFixed(1)); s.setAttribute('y1', hy.toFixed(1));
  s.setAttribute('x2', (hx * .45 + 420 * .55).toFixed(1)); s.setAttribute('y2', '-60');
}
setLadle(0);
const setRing = (p) => { ringFg.style.strokeDashoffset = String(100 - Math.min(1, p) * 100); };
const nextVision = () => HIDDEN.find((d) => data.items[d.key] && !st.dev.has(d.key));

let stirring = false, lastA = 0, lastSwish = 0, summoning = false;
const angleOf = (e) => { const r = pot.getBoundingClientRect(); return Math.atan2((e.clientY - (r.top + r.height * .467)) * 2.1, e.clientX - (r.left + r.width / 2)); };
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
  draftText = ''; store.set('aa.text', ''); store.set('aa.copied', '');
  $$('.hang').forEach((h) => { h.classList.remove('poured', 'set', 'empty', 'coach'); $('.mark', h)?.remove(); });
  $('#trackDrops').innerHTML = ''; $('#trackStars').innerHTML = ''; $('#trackSeal i').classList.remove('on');
  flaskBtn.classList.remove('open', 'knock'); flaskBtn.dataset.hits = '0';
  $('#vialReal').style.setProperty('--v', 'transparent');
  paintGuess(); paintWho();
  npc = ''; pc = ''; store.set('aa.npc', ''); store.set('aa.pc', ''); paintWho();
  goStep('name');
});

/* 바텀시트 끌어 닫기 */
(() => {
  let y0 = null;
  const inner = $('#sheetInner');
  inner.addEventListener('touchstart', (e) => { if (inner.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  inner.addEventListener('touchmove', (e) => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) inner.style.transform = `translateY(${dy}px)`; }, { passive: true });
  inner.addEventListener('touchend', (e) => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; inner.style.transform = ''; y0 = null; if (dy > 110) closeSheet(); });
})();

/* 고양이 눈동자가 손가락·커서를 따라본다 */
{
  const pupils = $('#catPupils');
  let raf = 0;
  window.addEventListener('pointermove', (e) => {
    if (reduced || raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = $('#cat').getBoundingClientRect();
      const cx = r.left + r.width * .46, cy = r.top + r.height * .51;
      const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1;
      pupils.setAttribute('transform', `translate(${(dx / d * 3).toFixed(1)} ${(dy / d * 2.5).toFixed(1)})`);
    });
  }, { passive: true });
}

/* 말풍선이 고양이를 덮으면 고양이가 벽 아래로 쏙 숨는다 */
function avoidCat() {
  const c = $('#cat'), b = $('#sayBox');
  c.style.removeProperty('--duck');
  c.classList.remove('duck');
  if (b.offsetParent === null) return;
  const cr = c.getBoundingClientRect(), br = b.getBoundingClientRect();
  const hat = $('.cat-hatg').getBoundingClientRect();
  if (br.right <= cr.left + cr.width * .15 || br.bottom <= hat.top) return;
  // 모자 끝이 말풍선 아래로 내려갈 만큼 내린다 (최대: 귀 끝만 보이게)
  const need = Math.min(br.bottom - hat.top + 10, cr.height * .86);
  c.style.setProperty('--duck', need + 'px');
  c.classList.add('duck');
}
window.addEventListener('resize', () => requestAnimationFrame(avoidCat));
new ResizeObserver(() => avoidCat()).observe($('#sayBox'));

/* ───────── 시작 ───────── */
buildHangs();
function freshStart() {
  npc = ''; pc = ''; G = { g: {}, attach: null }; draftText = '';
  ['aa.npc', 'aa.pc', 'aa.text', 'aa.step'].forEach((k) => store.set(k, ''));
  saveGuess(); paintWho(); paintGuess(); goStep('intro');
}
{
  const saved = store.get('aa.step');
  const at = +(store.get('aa.stepAt') || 0);
  const recent = Date.now() - at < 30 * 60 * 1000;
  if ((saved === 'ooc' || saved === 'paste') && npc && recent) {
    paintWho(); paintGuess(); setPhase('paste');
    ask(`다시 왔구나! <b>${esc(npc)}</b>의 물약을 만들던 중이었어. 주문은 채팅에 보냈어?`,
      `<div class="say-row"><button class="mini primary" id="fResume" type="button">응, 답변 받아 왔어</button><button class="mini" id="fRestart" type="button">처음부터</button></div>`,
      (f) => {
        $('#fResume', f).addEventListener('click', () => { sfx.tap(); goStep('paste'); });
        $('#fRestart', f).addEventListener('click', () => { sfx.tap(); freshStart(); });
      });
  } else freshStart();
}
