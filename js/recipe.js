// 레시피 카드: 이번 물약으로 알게 된 것을 한 장에 정리한다. 같은 모델로 화면용 HTML 과 저장용 PNG 를 만든다.
//  1) 마녀 등급(내 예상이 몇 병 맞았나)  2) 끌리는 이유 TOP 3 + 속마음  3) 덜 끌리는 것 · 사랑의 언어
//  4) 끌림 12가지 칸(성공/실패 + %)  5) 숨겨진 마음 칸  6) 아직 하지 못한 말
import { ANXIETY, HIDDEN, tierOf, TIER_LABEL } from './items.js?v=27';
import { colorName, potionName, witchRank, hsl, josa } from './brew.js?v=27';

/** "한국어. (English.)" → [한국어, 영어]. 괄호 속 번역은 아래 작은 줄로 */
const splitEn = (t) => { const m = /^(.*?)\s*\(([^()]*[A-Za-z][^()]*)\)\s*$/.exec(t || ''); return m && /[가-힣]/.test(m[1]) ? [m[1], m[2]] : [t || '', '']; };
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
  const cmp = (s, label) => `<div class="rc-cmp"><i style="background:${s ? s.color : 'transparent'}"></i><span><small>${label}</small><b>${s ? esc(s.name) : '없음'}</b></span></div>`;
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
    <h3 class="rc-title">${esc(m.title)}</h3>
    <p class="rc-who"><span>${esc(m.npc)}</span>${m.pc ? `<i aria-hidden="true">→</i><span>${esc(m.pc)}</span>` : ''}</p>
    ${m.mine || m.real ? `<div class="rc-compare">
      ${cmp(m.mine, '내 물약')}
      <span class="rc-vs" aria-hidden="true">vs</span>
      ${cmp(m.real, '사랑의 물약')}
    </div>` : ''}
  </header>

  <section class="rc-sec">
    <h4>${esc(who(m))} 끌리는 이유 TOP 3</h4>
    <ol class="rc-top">${m.top.map((t, i) => `
      <li>
        <span class="rc-n">${i + 1}</span>
        <div><p class="rc-line"><b>${esc(t.name)}</b><em>${t.pct}%</em></p>${bar(t.pct)}
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
    <h4>끌림 12가지 한눈에${m.rank.guessed ? `<small class="rc-score"><span class="ok">✓ 성공 ${m.rank.hits}</span><span class="ng">✕ 실패 ${m.rank.guessed - m.rank.hits}</span></small>` : ''}</h4>
    <ul class="rc-grid">${m.all.map((a) => `
      <li class="rc-cell ${a.mark || 'none'}"><span class="rc-cell-k">${esc(a.name)}</span><b class="rc-cell-v">${a.pct}<small>%</small></b><span class="rc-cell-m">${a.mark === 'hit' ? '✓ 성공' : a.mark === 'miss' ? '✕ 실패' : '예상 없음'}</span></li>`).join('')}
    </ul>
  </section>

  ${m.hidden.length ? `<section class="rc-sec">
    <h4>숨겨진 마음</h4>
    <ul class="rc-grid hid">${m.hidden.map((h) => `<li class="rc-cell"><span class="rc-cell-k">${esc(h.name)}</span><b class="rc-cell-v">${h.pct ?? '—'}<small>%</small></b></li>`).join('')}</ul>
  </section>` : ''}

  ${m.deep ? (() => { const [ko, en] = splitEn(m.deep); return `<section class="rc-sec rc-deep">
    <span class="rc-deep-mark" aria-hidden="true">“</span>
    <h4>${esc(m.npc)}, 아직 하지 못한 말</h4>
    <p class="rc-deep-ko">${esc(ko)}</p>
    ${en ? `<p class="rc-deep-en">${esc(en)}</p>` : ''}
  </section>`; })() : ''}`;
}

/* ───────── 저장용 PNG (폭 420px × 2배). 화면 카드와 같은 순서·내용 ───────── */
export function recipeCanvas(m) {
  const S = 2, W = 420, P = 24;
  const BODY = "'IBM Plex Sans KR', sans-serif", SERIF = "'Gowun Batang', serif";
  const INK = '#2b2033', INK2 = '#6f6478', WAX = '#b8336f'; // 화면과 같은 색 체계: 글자 Plum · 보조 회보라 · 주색 Rose
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
      if (mark) { g.fillStyle = mark === 'hit' ? '#b8336f' : '#a39aab'; g.fillText(mark === 'hit' ? '✓' : '✕', W - P, yy); }
    });
  };
  const bar = (x, yy, w, pct, color = WAX) => draw((g) => {
    g.fillStyle = 'rgba(43,32,51,.1)'; rr(g, x, yy, w, 7, 4); g.fill();
    g.fillStyle = color; rr(g, x, yy, Math.max(7, (w * pct) / 100), 7, 4); g.fill();
  });
  const heading = (s) => { y += 6; para(s, 15, { weight: 700, color: WAX }); y += 2; };
  const rule = () => { const yy = y + 6; draw((g) => { g.strokeStyle = 'rgba(43,32,51,.14)'; g.lineWidth = 1; g.beginPath(); g.moveTo(P, yy); g.lineTo(W - P, yy); g.stroke(); }); y += 14; };

  // 1) 마녀 등급
  const boxTop = y, boxH = m.rank.guessed ? 116 : 92;
  draw((g) => { g.fillStyle = '#3d2c52'; rr(g, P, boxTop, W - P * 2, boxH, 14); g.fill(); });
  y += 22;
  para('마녀 등급', 12, { weight: 700, color: '#f0c050', align: 'center' });
  para(m.rank.guessed ? m.rank.label : '예상 없이 끓였어요', 24, { weight: 700, font: SERIF, color: '#fdf4f8', align: 'center' }, W - P * 2, 1.3);
  if (m.rank.guessed) {
    para(starsText(m.rank.stars), 16, { color: '#f0c050', align: 'center' }, W, 1.35);
    para(`내 예상 ${m.rank.guessed}병 중 ${m.rank.hits}병 맞힘`, 12, { weight: 600, color: 'rgba(253,244,248,.78)', align: 'center' });
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
    y += 22; bar(P, y, W - P * 2, t.pct); y += 14;
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

  // 4) 끌림 12가지: 칸마다 이름 · % · 성공/실패
  const grid = (cells, cols, withMark) => {
    const gap = 8, cw = (W - P * 2 - gap * (cols - 1)) / cols, ch = withMark ? 74 : 56;
    cells.forEach((a, k) => {
      const x = P + (k % cols) * (cw + gap), yy = y + Math.floor(k / cols) * (ch + gap);
      const mk = withMark ? (a.mark || 'none') : 'none';
      draw((g) => {
        g.fillStyle = mk === 'hit' ? '#fce8f1' : '#ffffff'; rr(g, x, yy, cw, ch, 10); g.fill();
        g.strokeStyle = mk === 'hit' ? '#e0528f' : 'rgba(43,32,51,.14)'; g.lineWidth = 1; rr(g, x + .5, yy + .5, cw - 1, ch - 1, 10); g.stroke();
        g.textAlign = 'center';
        g.font = `700 11px ${BODY}`; g.fillStyle = INK2; g.fillText(a.name, x + cw / 2, yy + 22);
        g.font = `700 19px ${BODY}`; g.fillStyle = INK; g.fillText(`${a.pct ?? '—'}%`, x + cw / 2, yy + 46);
        if (withMark) {
          const lab = mk === 'hit' ? '✓ 성공' : mk === 'miss' ? '✕ 실패' : '예상 없음';
          g.font = `800 10.5px ${BODY}`;
          const tw = g.measureText(lab).width + 14;
          g.fillStyle = mk === 'hit' ? '#e0528f' : '#f2ebe2';
          rr(g, x + cw / 2 - tw / 2, yy + 53, tw, 16, 8); g.fill();
          g.fillStyle = mk === 'hit' ? '#fff' : '#6f6478'; g.fillText(lab, x + cw / 2, yy + 65);
        }
      });
    });
    y += Math.ceil(cells.length / cols) * (ch + gap);
  };
  heading(m.rank.guessed ? `끌림 12가지 한눈에 · 성공 ${m.rank.hits} / 실패 ${m.rank.guessed - m.rank.hits}` : '끌림 12가지 한눈에');
  y += 4; grid(m.all, 4, true);
  rule();

  // 5) 숨겨진 마음
  if (m.hidden.length) {
    heading('숨겨진 마음');
    y += 4; grid(m.hidden, 3, false);
    rule();
  }

  // 6) 아직 하지 못한 말
  if (m.deep) {
    const [ko, en] = splitEn(m.deep);
    heading(`${m.npc}, 아직 하지 못한 말`);
    para(`“${ko}”`, 15, { weight: 700, font: SERIF }, W - P * 2, 1.6);
    if (en) para(en, 12, { color: INK2 }, W - P * 2, 1.5);
  }
  y += 10;
  const H = Math.ceil(y + P);

  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const g = c.getContext('2d');
  g.scale(S, S);
  g.fillStyle = '#fbf7f1'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#3d2c52'; g.lineWidth = 2; g.strokeRect(8, 8, W - 16, H - 16);
  g.textBaseline = 'alphabetic';
  ops.forEach((op) => op(g));
  return c;
}
