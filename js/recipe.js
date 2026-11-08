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

/* ───────── 저장용 PNG: 화면의 레시피 카드와 같은 디자인 (폭 440px × 3배) ─────────
   배경은 종이색 한 장(테두리 선 없음), 섹션마다 둥근 흰 카드. 마녀 등급은 보라 그라데이션, 별은 도형으로 그린다.
   색은 화면과 같은 체계: 글자 Plum · 주색 Rose(맞힘·강조) · 중립(빗나감) · 포인트 Gold(등급 카드 안만). */
const C = {
  paper: '#fbf7f1', paper2: '#f2ebe2', card: '#ffffff', line: 'rgba(43,32,51,.12)',
  ink: '#2b2033', ink2: '#6f6478', ink3: '#a39aab',
  pri: '#e0528f', priInk: '#b8336f', priSoft: '#fce8f1', priLine: 'rgba(224,82,143,.45)',
  sub: '#2b2033', sub2: '#4a3566', gold: '#f0c050', onSub: '#fdf4f8',
};
const BODY = "'IBM Plex Sans KR', sans-serif", SERIF = "'Gowun Batang', serif";

/** 그릴 글자들의 웹폰트 조각을 미리 불러온다(구글 폰트는 쓰인 글자만 받아 두므로, 안 하면 이미지에서 글꼴이 바뀐다) */
export async function prepareRecipeFonts(m) {
  if (!document.fonts || !document.fonts.load) return;
  const all = JSON.stringify(m) + '마녀 등급내 예상병 중맞힘끌리는 이유가장 덜 끌리는 것사랑의 언어끌림가지 한눈에성공실패숨겨진 마음아직 하지 못한 말내 물약사랑의 물약예상과 같음나는라고 예상vs%→0123456789RECIPENo.';
  const specs = ['400 14px "IBM Plex Sans KR"', '500 14px "IBM Plex Sans KR"', '700 14px "IBM Plex Sans KR"', '700 20px "Gowun Batang"', '400 14px "Gowun Batang"'];
  try { await Promise.all(specs.map((f) => document.fonts.load(f, all))); } catch { /* 그래도 그린다 */ }
}

export function recipeCanvas(m) {
  const S = 3, W = 440, P = 20, CW = W - P * 2, IN = 16; // IN: 카드 안쪽 여백
  const meas = document.createElement('canvas').getContext('2d');
  const font = (w, size, fam = BODY, it = false) => `${it ? 'italic ' : ''}${w} ${size}px ${fam}`;
  /** 줄바꿈은 화면(word-break: keep-all)처럼 낱말 단위. 한 낱말이 한 줄보다 길 때만 글자 단위로 자른다 */
  const wrap = (str, f, maxW) => {
    meas.font = f;
    const fits = (t) => meas.measureText(t).width <= maxW;
    const out = []; let line = '';
    for (const word of String(str).split(/(\s+)/).filter((w) => w !== '')) {
      const next = line + word;
      if (fits(next) || !line.trim()) {
        if (fits(next)) { line = next; continue; }
        for (const ch of word) { if (!fits(line + ch) && line) { out.push(line); line = ''; } line += ch; } // 긴 낱말
        continue;
      }
      out.push(line.trimEnd());
      line = /^\s+$/.test(word) ? '' : word;
      if (!fits(line)) { const w = line; line = ''; for (const ch of w) { if (!fits(line + ch) && line) { out.push(line); line = ''; } line += ch; } }
    }
    if (line.trim()) out.push(line.trimEnd());
    return out;
  };
  const tw = (str, f) => { meas.font = f; return meas.measureText(str).width; };

  const ops = [];
  const draw = (fn) => { ops.push(fn); };
  let y = P;
  const rr = (g, x, yy, w, h, r) => { g.beginPath(); g.roundRect(x, yy, w, h, r); };
  const txt = (str, x, yy, f, color, align = 'left') => draw((g) => { g.font = f; g.fillStyle = color; g.textAlign = align; g.fillText(str, x, yy); });
  const para = (str, x, maxW, f, size, color, lh = 1.6, align = 'left') => {
    for (const ln of wrap(str, f, maxW)) { txt(ln, align === 'center' ? x + maxW / 2 : x, y + size, f, color, align); y += size * lh; }
  };
  const pill = (label, cx, yy, f, bg, fg, h = 20, padX = 9, align = 'center') => {
    const w = tw(label, f) + padX * 2;
    const x = align === 'center' ? cx - w / 2 : cx;
    draw((g) => { g.fillStyle = bg; rr(g, x, yy, w, h, h / 2); g.fill(); g.font = f; g.fillStyle = fg; g.textAlign = 'center'; g.fillText(label, x + w / 2, yy + h / 2 + 4.2); });
    return w;
  };
  const star = (g, cx, cy, r, filled) => {
    g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rad = i % 2 ? r * .45 : r; g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
    g.closePath();
    if (filled) { g.fillStyle = C.gold; g.fill(); } else { g.strokeStyle = C.gold; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke(); }
  };
  /** 카드: 안을 그린 뒤 높이를 알고 배경을 그 아래에 깐다 */
  const card = (build, { bg = C.card, border = C.line, shadow = true, grad = null } = {}) => {
    const at = ops.length, top = y;
    y += IN; build(); y += IN;
    const h = y - top;
    ops.splice(at, 0, (g) => {
      g.save();
      if (shadow) { g.shadowColor = 'rgba(43,32,51,.10)'; g.shadowBlur = 18; g.shadowOffsetY = 6; }
      g.fillStyle = grad ? grad(g, top, h) : bg; rr(g, P, top, CW, h, 18); g.fill();
      g.restore();
      if (border) { g.strokeStyle = border; g.lineWidth = 1; rr(g, P + .5, top + .5, CW - 1, h - 1, 17.5); g.stroke(); }
    });
    y += 12;
  };
  const head = (str) => { txt(str, P + IN, y + 15, font(700, 15.5), C.ink); y += 15 * 1.7; };
  const X = P + IN, IW = CW - IN * 2;

  // 1) 마녀 등급
  card(() => {
    const cx = W / 2;
    y += 4;
    txt('마녀 등급', cx, y + 12, font(700, 12), C.gold, 'center'); y += 22;
    para(m.rank.guessed ? m.rank.label : '예상 없이 끓였어요', X, IW, font(700, 26, SERIF), 26, C.onSub, 1.35, 'center');
    if (m.rank.guessed) {
      const sy = y + 12, n = m.rank.stars;
      draw((g) => { for (let i = 0; i < 5; i++) star(g, cx + (i - 2) * 24, sy, 9.5, i < n); });
      y += 30;
      txt(`내 예상 ${m.rank.guessed}병 중 ${m.rank.hits}병 맞힘`, cx, y + 13, font(500, 13), 'rgba(253,244,248,.82)', 'center'); y += 20;
    } else { txt('다음엔 병마다 먼저 예상해 보세요', cx, y + 13, font(500, 13), 'rgba(253,244,248,.82)', 'center'); y += 20; }
  }, { border: null, grad: (g, top, h) => { const gr = g.createRadialGradient(W / 2, top, 10, W / 2, top + h * .4, CW * .75); gr.addColorStop(0, C.sub2); gr.addColorStop(1, C.sub); return gr; } });

  // 2) 물약 이름 · 누가 누구에게 · 내 물약 vs 사랑의 물약
  card(() => {
    const cx = W / 2;
    draw((g) => { g.letterSpacing = '0.6px'; });
    txt(`RECIPE No.${m.no} · ${m.date} · ${m.moon}`, cx, y + 11, font(600, 11), C.ink3, 'center');
    draw((g) => { g.letterSpacing = '0px'; });
    y += 22;
    para(m.title, X, IW, font(700, 24, SERIF), 24, C.ink, 1.35, 'center');
    y += 4;
    const f = font(700, 13), a = m.npc, b = m.pc;
    const wa = tw(a, f) + 24, wb = b ? tw(b, f) + 24 : 0, gap = b ? 28 : 0;
    let x0 = cx - (wa + gap + wb) / 2;
    pill(a, x0, y, f, C.paper2, C.ink, 24, 12, 'left');
    if (b) { txt('→', x0 + wa + gap / 2, y + 17, font(500, 13), C.ink3, 'center'); pill(b, x0 + wa + gap, y, f, C.paper2, C.ink, 24, 12, 'left'); }
    y += 24;
    if (m.mine || m.real) {
      y += 14;
      const ty = y; // 그리기는 나중에 일어나므로 지금 y 를 붙잡아 둔다
      const tile = (s, label, x, w) => draw((g) => { const y = ty;
        g.fillStyle = C.paper; rr(g, x, y, w, 52, 14); g.fill();
        g.strokeStyle = C.line; g.lineWidth = 1; rr(g, x + .5, y + .5, w - 1, 51, 13.5); g.stroke();
        const sx = x + 24, sy = y + 26;
        if (s) {
          g.fillStyle = s.color; g.beginPath(); g.arc(sx, sy, 13, 0, Math.PI * 2); g.fill();
          const sh = g.createRadialGradient(sx - 4, sy - 5, 1, sx, sy, 14); sh.addColorStop(0, 'rgba(255,255,255,.55)'); sh.addColorStop(.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,.18)');
          g.fillStyle = sh; g.beginPath(); g.arc(sx, sy, 13, 0, Math.PI * 2); g.fill();
        } else { g.strokeStyle = C.ink3; g.setLineDash([3, 3]); g.beginPath(); g.arc(sx, sy, 12, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
        g.textAlign = 'left';
        g.font = font(600, 11); g.fillStyle = C.ink2; g.fillText(label, sx + 22, y + 22);
        g.font = font(700, 14); g.fillStyle = C.ink; g.fillText(s ? s.name : '없음', sx + 22, y + 40);
      });
      const vw = 26, w = (IW - vw) / 2;
      tile(m.mine, '내 물약', X, w);
      txt('vs', X + w + vw / 2, y + 30, font(800, 11), C.ink3, 'center');
      tile(m.real, '사랑의 물약', X + w + vw, w);
      y += 52;
    }
  });

  // 3) 끌리는 이유 TOP 3
  card(() => {
    head(`${who(m)} 끌리는 이유 TOP 3`);
    y += 2;
    m.top.forEach((t, i) => {
      const cy = y + 13;
      draw((g) => { g.fillStyle = C.ink; g.beginPath(); g.arc(X + 13, cy, 13, 0, Math.PI * 2); g.fill(); g.font = font(700, 13); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(String(i + 1), X + 13, cy + 4.6); });
      txt(t.name, X + 36, cy + 5.5, font(700, 16), C.ink);
      txt(`${t.pct}%`, X + IW, cy + 5.5, font(700, 16), C.priInk, 'right');
      y += 30;
      const bx = X + 36, bw = IW - 36;
      const by = y;
      draw((g) => { g.fillStyle = 'rgba(43,32,51,.08)'; rr(g, bx, by, bw, 7, 3.5); g.fill(); g.fillStyle = C.pri; rr(g, bx, by, Math.max(7, (bw * t.pct) / 100), 7, 3.5); g.fill(); });
      y += 16;
      if (t.status) para(`“${t.status}”`, bx, bw, font(700, 14.5, SERIF), 14.5, C.ink, 1.6);
      y += i < m.top.length - 1 ? 12 : 0;
    });
  });

  // 4) 가장 덜 끌리는 것 · 사랑의 언어 (두 칸)
  if (m.low || m.lang) {
    card(() => {
      const cols = [m.low, m.lang].filter(Boolean).length, gap = 18, w = (IW - gap * (cols - 1)) / cols;
      const top = y; let maxY = y, x = X;
      const col = (title, name, pct, tag, quote) => {
        y = top;
        txt(title, x, y + 14, font(700, 14), C.ink); y += 26;
        txt(name, x, y + 15, font(700, 15.5), C.ink);
        if (pct != null) txt(`${pct}%`, x + w, y + 15, font(700, 15.5), C.priInk, 'right');
        y += 26;
        if (tag) { pill(tag.label, x, y, font(700, 11.5), tag.hit ? C.pri : C.paper2, tag.hit ? '#fff' : C.ink2, 22, 10, 'left'); y += 30; }
        if (quote) para(`“${quote}”`, x, w, font(700, 13.5, SERIF), 13.5, C.ink2, 1.6);
        maxY = Math.max(maxY, y); x += w + gap;
      };
      if (m.low) col('가장 덜 끌리는 것', m.low.name, m.low.pct, null, m.low.status);
      if (m.lang) col('사랑의 언어', m.lang.types.join('·') || '알 수 없음', m.lang.pct,
        m.lang.guess ? { hit: m.lang.hit, label: m.lang.hit ? '✓ 내 예상과 같음' : `✕ 나는 ${josa(m.lang.guess, '이라고', '라고')} 예상` } : null, m.lang.status);
      y = maxY;
    });
  }

  // 5) 끌림 12가지: 칸마다 이름 · % · 성공/실패
  const grid = (cells, cols, withMark) => {
    const gap = 8, cw = (IW - gap * (cols - 1)) / cols, ch = withMark ? 84 : 64;
    cells.forEach((a, k) => {
      const x = X + (k % cols) * (cw + gap), yy = y + Math.floor(k / cols) * (ch + gap);
      const mk = withMark ? (a.mark || 'none') : 'none';
      draw((g) => {
        g.fillStyle = mk === 'hit' ? C.priSoft : C.card; rr(g, x, yy, cw, ch, 12); g.fill();
        g.strokeStyle = mk === 'hit' ? C.priLine : C.line; g.lineWidth = 1; rr(g, x + .5, yy + .5, cw - 1, ch - 1, 11.5); g.stroke();
        g.textAlign = 'center';
        const lines = wrap(a.name, font(600, 12), cw - 10);
        lines.slice(0, 2).forEach((ln, i) => { g.font = font(600, 12); g.fillStyle = C.ink2; g.fillText(ln, x + cw / 2, yy + 22 + i * 14 - (lines.length > 1 ? 6 : 0)); });
        const v = `${a.pct ?? '—'}`, vf = font(700, 22), pf = font(700, 12);
        g.font = vf; const vw = g.measureText(v).width; g.font = pf; const pw = g.measureText('%').width;
        const vx = x + cw / 2 - (vw + pw + 1) / 2, vy = yy + (withMark ? 52 : 50);
        g.textAlign = 'left'; g.fillStyle = mk === 'miss' ? C.ink2 : C.ink;
        g.font = vf; g.fillText(v, vx, vy); g.font = pf; g.fillText('%', vx + vw + 1, vy);
      });
      if (withMark && mk !== 'none') pill(mk === 'hit' ? '✓ 성공' : '✕ 실패', x + cw / 2, yy + 60, font(700, 11), mk === 'hit' ? C.pri : C.paper2, mk === 'hit' ? '#fff' : C.ink2, 18, 9);
    });
    y += Math.ceil(cells.length / cols) * (ch + gap) - gap;
  };
  card(() => {
    txt('끌림 12가지 한눈에', X, y + 15, font(700, 15.5), C.ink);
    if (m.rank.guessed) {
      const f = font(700, 11.5), w1 = tw(`✓ 성공 ${m.rank.hits}`, f) + 18;
      pill(`✕ 실패 ${m.rank.guessed - m.rank.hits}`, X + IW - (tw(`✕ 실패 ${m.rank.guessed - m.rank.hits}`, f) + 18), y + 1, f, C.paper2, C.ink2, 21, 9, 'left');
      pill(`✓ 성공 ${m.rank.hits}`, X + IW - (tw(`✕ 실패 ${m.rank.guessed - m.rank.hits}`, f) + 18) - 6 - w1, y + 1, f, C.priSoft, C.priInk, 21, 9, 'left');
    }
    y += 32;
    grid(m.all, 4, true);
  });

  // 6) 숨겨진 마음
  if (m.hidden.length) card(() => { head('숨겨진 마음'); y += 2; grid(m.hidden, 3, false); });

  // 7) 아직 하지 못한 말: 흰색 → 옅은 장미색 카드
  if (m.deep) {
    const [ko, en] = splitEn(m.deep);
    card(() => {
      txt('“', W / 2, y + 40, font(700, 52, SERIF), 'rgba(224,82,143,.4)', 'center'); y += 34;
      txt(`${m.npc}, 아직 하지 못한 말`, W / 2, y + 12, font(700, 12), C.priInk, 'center'); y += 26;
      para(ko, X + 6, IW - 12, font(700, 17.5, SERIF), 17.5, C.ink, 1.65, 'center');
      if (en) { y += 4; para(en, X + 10, IW - 20, font(400, 12.5, BODY, true), 12.5, C.ink2, 1.55, 'center'); }
    }, { border: C.priLine, grad: (g, top, h) => { const gr = g.createLinearGradient(0, top, 0, top + h); gr.addColorStop(.3, '#ffffff'); gr.addColorStop(1, C.priSoft); return gr; } });
  }

  const H = Math.ceil(y - 12 + P);
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const g = c.getContext('2d');
  g.scale(S, S);
  g.fillStyle = C.paper; g.fillRect(0, 0, W, H);
  g.textBaseline = 'alphabetic';
  ops.forEach((op) => op(g));
  return c;
}
