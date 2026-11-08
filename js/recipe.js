// 레시피 카드: 이번 물약으로 알게 된 것을 한 장에 정리한다. 같은 모델로 화면용 HTML 과 저장용 PNG 를 만든다.
//  1) 마녀 등급(내 예상이 몇 병 맞았나)  2) 끌리는 이유 TOP 3 + 속마음  3) 덜 끌리는 것 · 사랑의 언어
//  4) 끌림 12가지 막대  5) 숨겨진 마음  6) 아직 하지 못한 말
import { ANXIETY, HIDDEN, tierOf, TIER_LABEL } from './items.js?v=27';
import { colorName, potionName, witchRank, hsl, josa } from './brew.js?v=27';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** 맞힌 비율 → 별 0~5 */
const starsOf = (guessed, hits) => (guessed ? Math.round((hits / guessed) * 5) : 0);
const starsText = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
const who = (m) => (m.pc ? `${josa(m.npc, '이', '가')} ${m.pc}에게` : josa(m.npc, '이', '가'));

export function recipeModel({ data, npc, pc, date, moon, brew, guessBrew = null, guesses = {}, attachGuess = null, guessed, hits }) {
  const items = data.items;
  const defs = ANXIETY.filter((d) => items[d.key]?.pct != null);
  const all = defs.map((d) => {
    const it = items[d.key];
    const g = guesses[d.key];
    return { name: d.short, pct: it.pct, color: d.color, status: it.status, mark: g ? (tierOf(it.pct) === g ? 'hit' : 'miss') : null, guess: g ? TIER_LABEL[g] : null };
  });
  const ranked = [...all].sort((a, b) => b.pct - a.pct);
  const lang = items.attach;
  return {
    no: String((npc.length * 977 + date.replace(/\D/g, '') % 9973) % 10000).padStart(4, '0'),
    title: potionName([...defs].sort((a, b) => items[b.key].pct - items[a.key].pct)),
    npc, pc, date, moon: moon.label,
    real: brew ? { color: hsl(brew.h, brew.s, brew.l), name: colorName(brew) } : null,
    mine: guessBrew ? { color: hsl(guessBrew.h, guessBrew.s, guessBrew.l), name: colorName(guessBrew) } : null,
    rank: { label: witchRank(guessed, hits), stars: starsOf(guessed, hits), hits, guessed },
    top: ranked.slice(0, 3),
    low: ranked.length > 3 ? ranked[ranked.length - 1] : null,
    lang: lang ? { types: lang.types || [], pct: lang.pct, status: lang.status, guess: attachGuess, hit: attachGuess ? (lang.types || []).includes(attachGuess) : null } : null,
    all,
    hidden: HIDDEN.filter((d) => d.key !== 'attach' && items[d.key]).map((d) => ({ name: d.name, pct: items[d.key].pct })),
    deep: data.deepest ? (data.deepest.title || data.deepest.body.split('\n')[0].slice(0, 80)) : '',
  };
}

export function recipeHTML(m) {
  const bar = (pct, color = '') => `<span class="rc-bar"><i style="width:${pct}%${color ? `;background:${color}` : ''}"></i></span>`;
  const swatch = (s, label) => (s ? `<span class="rc-sw"><i style="background:${s.color}"></i>${label} · ${esc(s.name)}</span>` : '');
  const rank = m.rank.guessed
    ? `<div class="rc-rank">
        <p class="rc-rank-k">마녀 등급</p>
        <p class="rc-rank-v">${esc(m.rank.label)}</p>
        <p class="rc-stars" aria-label="별 다섯 개 중 ${m.rank.stars}개">${starsText(m.rank.stars)}</p>
        <p class="rc-rank-s">내 예상 <b>${m.rank.guessed}병 중 ${m.rank.hits}병</b> 맞힘</p>
      </div>`
    : `<div class="rc-rank none"><p class="rc-rank-k">마녀 등급</p><p class="rc-rank-v">예상 없이 끓였어요</p><p class="rc-rank-s">다음엔 병마다 먼저 예상해 보세요</p></div>`;
  return `
  ${rank}
  <header class="rc-head">
    <p class="rc-no">RECIPE No.${m.no} · ${esc(m.date)} · ${esc(m.moon)}</p>
    <h3 class="rc-title">「${esc(m.title)}」</h3>
    <p class="rc-who">${esc(m.npc)}${m.pc ? ` → ${esc(m.pc)}` : ''}</p>
    <p class="rc-sws">${swatch(m.mine, '내 물약')}${swatch(m.real, '진짜 물약')}</p>
  </header>

  <section class="rc-sec">
    <h4>${esc(who(m))} 끌리는 이유 TOP 3</h4>
    <ol class="rc-top">${m.top.map((t, i) => `
      <li>
        <span class="rc-n">${i + 1}</span>
        <div><p class="rc-line"><b>${esc(t.name)}</b><em>${t.pct}%</em></p>${bar(t.pct, t.color)}
        ${t.status ? `<p class="rc-quote">“${esc(t.status)}”</p>` : ''}</div>
      </li>`).join('')}
    </ol>
  </section>

  ${m.low || m.lang ? `<section class="rc-sec rc-two">
    ${m.low ? `<div class="rc-mini"><h4>가장 덜 끌리는 것</h4><p class="rc-line"><b>${esc(m.low.name)}</b><em>${m.low.pct}%</em></p>${m.low.status ? `<p class="rc-quote">“${esc(m.low.status)}”</p>` : ''}</div>` : ''}
    ${m.lang ? `<div class="rc-mini"><h4>사랑의 언어</h4><p class="rc-line"><b>${esc(m.lang.types.join('·') || '알 수 없음')}</b>${m.lang.pct != null ? `<em>${m.lang.pct}%</em>` : ''}</p>
      ${m.lang.guess ? `<p class="rc-tag ${m.lang.hit ? 'hit' : 'miss'}">${m.lang.hit ? '✓ 내 예상과 같음' : `✕ 나는 ${esc(josa(m.lang.guess, '이라고', '라고'))} 예상`}</p>` : ''}
      ${m.lang.status ? `<p class="rc-quote">“${esc(m.lang.status)}”</p>` : ''}</div>` : ''}
  </section>` : ''}

  <section class="rc-sec">
    <h4>끌림 12가지 한눈에 ${m.rank.guessed ? '<small>✓ 예상 적중 · ✕ 빗나감</small>' : ''}</h4>
    <ul class="rc-all">${m.all.map((a) => `
      <li><span class="rc-k">${esc(a.name)}</span>${bar(a.pct, a.color)}<span class="rc-v">${a.pct}%</span><span class="rc-m ${a.mark || ''}">${a.mark === 'hit' ? '✓' : a.mark === 'miss' ? '✕' : ''}</span></li>`).join('')}
    </ul>
  </section>

  ${m.hidden.length ? `<section class="rc-sec">
    <h4>숨겨진 마음</h4>
    <ul class="rc-all hid">${m.hidden.map((h) => `<li><span class="rc-k">${esc(h.name)}</span>${bar(h.pct ?? 0)}<span class="rc-v">${h.pct ?? '—'}%</span></li>`).join('')}</ul>
  </section>` : ''}

  ${m.deep ? `<section class="rc-sec rc-deep"><h4>${esc(m.npc)}, 아직 하지 못한 말</h4><p>“${esc(m.deep)}”</p></section>` : ''}
  <p class="rc-foot">마음 달이는 다락방 · 놀이용 해석이에요</p>`;
}

/* ───────── 저장용 PNG (폭 420px × 2배). 화면 카드와 같은 순서·내용 ───────── */
export function recipeCanvas(m) {
  const S = 2, W = 420, P = 24;
  const BODY = "'IBM Plex Sans KR', sans-serif", SERIF = "'Gowun Batang', serif";
  const INK = '#2b2033', INK2 = '#6e5a42', WAX = '#9d2f55';
  const meas = document.createElement('canvas').getContext('2d');
  const wrap = (s, font, maxW) => {
    meas.font = font;
    const out = []; let line = '';
    for (const ch of s) { if (meas.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
    if (line) out.push(line);
    return out;
  };

  // 그리기 명령을 모으면서 높이를 잰다
  const ops = [];
  let y = P;
  const draw = (fn) => ops.push(fn);
  const rr = (g, x, yy, w, h, r) => { g.beginPath(); g.roundRect(x, yy, w, h, r); };
  const para = (s, size, { weight = 400, font = BODY, color = INK, align = 'left' } = {}, maxW = W - P * 2, lh = 1.55) => {
    const f = `${weight} ${size}px ${font}`;
    for (const ln of wrap(s, f, maxW)) {
      const yy = y + size;
      draw((g) => { g.font = f; g.fillStyle = color; g.textAlign = align; g.fillText(ln, align === 'center' ? W / 2 : P, yy); });
      y += size * lh;
    }
  };
  const row = (left, right, size, { weight = 600, color = INK, rcolor = INK, mark = null } = {}) => {
    const yy = y + size;
    draw((g) => {
      g.font = `${weight} ${size}px ${BODY}`; g.textAlign = 'left'; g.fillStyle = color; g.fillText(left, P, yy);
      g.textAlign = 'right'; g.fillStyle = rcolor; g.fillText(right, W - P - (mark ? 20 : 0), yy);
      if (mark) { g.fillStyle = mark === 'hit' ? '#2c8a3c' : '#b3262e'; g.fillText(mark === 'hit' ? '✓' : '✕', W - P, yy); }
    });
  };
  const bar = (x, yy, w, pct, color = WAX) => draw((g) => {
    g.fillStyle = 'rgba(46,32,20,.12)'; rr(g, x, yy, w, 7, 4); g.fill();
    g.fillStyle = color; rr(g, x, yy, Math.max(7, (w * pct) / 100), 7, 4); g.fill();
  });
  const heading = (s) => { y += 6; para(s, 15, { weight: 700, color: WAX }); y += 2; };
  const rule = () => { const yy = y + 6; draw((g) => { g.strokeStyle = 'rgba(46,32,20,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(P, yy); g.lineTo(W - P, yy); g.stroke(); }); y += 14; };

  // 1) 마녀 등급
  const boxTop = y, boxH = m.rank.guessed ? 116 : 92;
  draw((g) => { g.fillStyle = '#2b2033'; rr(g, P, boxTop, W - P * 2, boxH, 14); g.fill(); });
  y += 22;
  para('마녀 등급', 12, { weight: 700, color: '#f0c050', align: 'center' });
  para(m.rank.guessed ? m.rank.label : '예상 없이 끓였어요', 24, { weight: 700, font: SERIF, color: '#fff4d0', align: 'center' }, W - P * 2, 1.3);
  if (m.rank.guessed) {
    para(starsText(m.rank.stars), 16, { color: '#f0c050', align: 'center' }, W, 1.35);
    para(`내 예상 ${m.rank.guessed}병 중 ${m.rank.hits}병 맞힘`, 12, { weight: 600, color: '#d8d0ee', align: 'center' });
  }
  y = boxTop + boxH + 16;

  // 머리
  para(`RECIPE No.${m.no} · ${m.date} · ${m.moon}`, 11, { color: INK2, align: 'center' });
  para(`「${m.title}」`, 22, { weight: 700, font: SERIF, align: 'center' }, W - P * 2, 1.35);
  para(`${m.npc}${m.pc ? ` → ${m.pc}` : ''}`, 13, { weight: 600, color: INK2, align: 'center' });
  rule();

  // 2) TOP 3
  heading(`${who(m)} 끌리는 이유 TOP 3`);
  m.top.forEach((t, i) => {
    row(`${i + 1}. ${t.name}`, `${t.pct}%`, 15, { weight: 700, rcolor: WAX });
    y += 22; bar(P, y, W - P * 2, t.pct, t.color); y += 14;
    if (t.status) para(`“${t.status}”`, 13, { weight: 700, font: SERIF }, W - P * 2, 1.5);
    y += 6;
  });
  rule();

  // 3) 덜 끌리는 것 · 사랑의 언어
  if (m.low) {
    heading('가장 덜 끌리는 것');
    para(`${m.low.name} ${m.low.pct}%`, 15, { weight: 700 });
    if (m.low.status) para(`“${m.low.status}”`, 13, { weight: 700, font: SERIF, color: INK2 });
  }
  if (m.lang) {
    heading('사랑의 언어');
    const verdict = m.lang.guess ? (m.lang.hit ? '  ✓ 내 예상과 같음' : `  ✕ 나는 ${josa(m.lang.guess, '이라고', '라고')} 예상`) : '';
    para(`${m.lang.types.join('·') || '알 수 없음'}${m.lang.pct != null ? ` ${m.lang.pct}%` : ''}${verdict}`, 15, { weight: 700 });
    if (m.lang.status) para(`“${m.lang.status}”`, 13, { weight: 700, font: SERIF, color: INK2 });
  }
  rule();

  // 4) 끌림 12가지
  heading('끌림 12가지 한눈에');
  m.all.forEach((a) => {
    row(a.name, `${a.pct}%`, 13, { mark: a.mark });
    bar(P + 92, y + 6, W - P * 2 - 92 - 64, a.pct, a.color);
    y += 22;
  });
  rule();

  // 5) 숨겨진 마음
  if (m.hidden.length) {
    heading('숨겨진 마음');
    m.hidden.forEach((h) => { row(h.name, `${h.pct ?? '—'}%`, 13); bar(P + 112, y + 6, W - P * 2 - 112 - 44, h.pct ?? 0); y += 22; });
    rule();
  }

  // 6) 아직 하지 못한 말
  if (m.deep) { heading(`${m.npc}, 아직 하지 못한 말`); para(`“${m.deep}”`, 15, { weight: 700, font: SERIF }, W - P * 2, 1.6); }
  y += 10;
  para('마음 달이는 다락방 · 놀이용 해석이에요', 11, { color: INK2, align: 'center' });
  const H = Math.ceil(y + P);

  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const g = c.getContext('2d');
  g.scale(S, S);
  g.fillStyle = '#f3e6c6'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#6b4426'; g.lineWidth = 2; g.strokeRect(8, 8, W - 16, H - 16);
  g.textBaseline = 'alphabetic';
  ops.forEach((op) => op(g));
  return c;
}
