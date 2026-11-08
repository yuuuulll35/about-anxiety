// 물약 레시피 카드: 한 모델에서 HTML 과 저장용 캔버스를 함께 만든다.
import { ANXIETY, HIDDEN } from './items.js';
import { colorName, potionName, witchRank, hsl } from './brew.js';
import { tierOf } from './items.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function recipeModel({ data, npc, pc, date, moon, brew, guessBrew = null, guesses = {}, attachGuess = null, guessed, hits }) {
  const L = [];
  const ranked = ANXIETY.filter((d) => data.items[d.key]?.pct != null)
    .sort((a, b) => data.items[b.key].pct - data.items[a.key].pct);
  const no = String((npc.length * 977 + date.replace(/\D/g, '') % 9973) % 10000).padStart(4, '0');
  L.push({ t: 'no', s: `RECIPE No.${no}` });
  L.push({ t: 'title', s: potionName(ranked) });
  if (brew && guessBrew) {
    L.push({ t: 'swatch2',
      a: { color: hsl(guessBrew.h, guessBrew.s, guessBrew.l), s: `나만의 물약 · ${colorName(guessBrew)}` },
      b: { color: hsl(brew.h, brew.s, brew.l), s: `진짜 물약 · ${colorName(brew)}` } });
  } else if (brew) L.push({ t: 'swatch', color: hsl(brew.h, brew.s, brew.l), s: `${colorName(brew)} 물약` });
  L.push({ t: 'hr' });
  L.push({ t: 'row', k: '의뢰 대상', v: npc });
  if (pc) L.push({ t: 'row', k: '의뢰인', v: pc });
  L.push({ t: 'row', k: '실험일', v: date });
  L.push({ t: 'row', k: '달의 위상', v: moon.label });
  L.push({ t: 'hr' });
  L.push({ t: 'sec', s: '재료 (끌리는 이유)' });
  for (const d of ANXIETY) {
    const it = data.items[d.key];
    const g = guesses[d.key];
    const mark = g && it && it.pct != null ? (tierOf(it.pct) === g ? ' ✓' : ' ✕') : '';
    L.push({ t: 'row', k: d.ing, v: it && it.pct != null ? `${it.pct}방울${mark}` : '—', dot: d.color });
  }
  L.push({ t: 'hr' });
  L.push({ t: 'sec', s: '연기 속 환영 (숨겨진 마음)' });
  for (const d of HIDDEN) {
    const it = data.items[d.key];
    let v = '—';
    if (it) {
      if (d.key === 'attach' && it.types && it.types.length) v = it.types.join('·') + (it.pct != null ? ` ${it.pct}%` : '') + (attachGuess ? (it.types.includes(attachGuess) ? ' ✓' : ' ✕') : '');
      else if (it.pct != null) v = it.pct + '%';
      else v = '보임';
    }
    L.push({ t: 'row', k: d.name, v });
  }
  L.push({ t: 'hr' });
  if (ranked.length) {
    const vals = ranked.map((d) => data.items[d.key].pct);
    L.push({ t: 'row', k: '평균 농도', v: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) + '%', big: true });
    const top = ranked[0], low = ranked[ranked.length - 1];
    L.push({ t: 'row', k: '가장 진한 재료', v: `${top.name.replace(/ ?끌림$/, '')} ${data.items[top.key].pct}%` });
    L.push({ t: 'row', k: '가장 옅은 재료', v: `${low.name.replace(/ ?끌림$/, '')} ${data.items[low.key].pct}%` });
  }
  L.push({ t: 'row', k: '진짜와 같은 병', v: guessed ? `${hits}/${guessed}` : '—' });
  L.push({ t: 'row', k: '마녀 등급', v: witchRank(guessed, hits), big: true });
  if (data.deepest) {
    L.push({ t: 'hr' });
    L.push({ t: 'center', s: '마지막 한 방울' });
    L.push({ t: 'quote', s: data.deepest.title || data.deepest.body.split('\n')[0].slice(0, 70) });
  }
  L.push({ t: 'sigil' });
  L.push({ t: 'center', s: '보름 전에, 혼자 있을 때 복용할 것', small: true });
  L.push({ t: 'center', s: '* 본 레시피는 진단서가 아닙니다 *', small: true });
  return L;
}

export function recipeHTML(model) {
  return model.map((l) => {
    switch (l.t) {
      case 'no': return `<div class="rc-c rc-no">${esc(l.s)}</div>`;
      case 'title': return `<div class="rc-c rc-title">「${esc(l.s)}」</div>`;
      case 'swatch': return `<div class="rc-swatch"><i style="background:${l.color}"></i>${esc(l.s)}</div>`;
      case 'swatch2': return `<div class="rc-swatch two"><span><i style="background:${l.a.color}"></i>${esc(l.a.s)}</span><span class="arrow">→</span><span><i style="background:${l.b.color}"></i>${esc(l.b.s)}</span></div>`;
      case 'center': return `<div class="rc-c"${l.small ? ' style="font-size:11px"' : ''}>${esc(l.s)}</div>`;
      case 'hr': return '<hr class="rc-hr">';
      case 'sec': return `<div class="rc-sec">${esc(l.s)}</div>`;
      case 'row': return `<div class="rc-row${l.big ? ' rc-big' : ''}"><span class="k">${l.dot ? `<span class="dot" style="background:${l.dot}"></span>` : ''}${esc(l.k)}</span><span class="dots"></span><span class="v">${esc(l.v)}</span></div>`;
      case 'quote': return `<p class="rc-quote">“${esc(l.s)}”</p>`;
      case 'sigil': return '<div class="rc-sigil" aria-hidden="true">✶ ☾ ✶</div>';
      default: return '';
    }
  }).join('');
}

/** 저장용 PNG 캔버스 (400px 폭 × 2배) */
export function recipeCanvas(model) {
  const S = 2, W = 400, PAD = 26, M = 24;
  const mono = "'Nanum Gothic Coding', monospace";
  const disp = "'Do Hyeon', sans-serif";
  const serif = "'Gowun Batang', serif";
  const latin = "'Cinzel Decorative', serif";
  const INK = '#2e2014', INK2 = '#6e5a42';
  const c = document.createElement('canvas');
  const g = c.getContext('2d');

  const wrap = (text, font, maxW) => {
    g.font = font;
    const out = []; let line = '';
    for (const ch of text) {
      if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
    }
    if (line) out.push(line);
    return out;
  };

  const H_OF = { no: 18, swatch: 36, swatch2: 58, center: 19, hr: 18, sec: 24, row: 21, sigil: 42 };
  const wrapped = {};
  let h = PAD;
  model.forEach((l, i) => {
    if (l.t === 'title') { wrapped[i] = wrap(`「${l.s}」`, `26px ${disp}`, W - PAD * 2); h += wrapped[i].length * 32 + 6; }
    else if (l.t === 'quote') { wrapped[i] = wrap(`“${l.s}”`, `14px ${serif}`, W - PAD * 2); h += wrapped[i].length * 22 + 8; }
    else h += H_OF[l.t] || 20;
  });
  h += PAD;

  c.width = (W + M * 2) * S; c.height = (h + M * 2) * S;
  g.scale(S, S);
  g.fillStyle = '#17112a'; g.fillRect(0, 0, W + M * 2, h + M * 2);
  // 별
  g.fillStyle = 'rgba(255,255,255,.5)';
  for (let k = 0; k < 40; k++) { g.beginPath(); g.arc((k * 97) % (W + M * 2), (k * 53) % (h + M * 2), k % 3 ? .8 : 1.4, 0, Math.PI * 2); g.fill(); }
  g.translate(M, M);

  g.fillStyle = '#0c0816'; g.fillRect(4, 4, W, h);
  const grad = g.createRadialGradient(W / 2, h * .4, Math.min(W, h) * .3, W / 2, h * .4, Math.max(W, h) * .7);
  grad.addColorStop(0, '#f3e6c6'); grad.addColorStop(1, '#dcc390');
  g.fillStyle = grad; g.fillRect(0, 0, W, h);
  g.strokeStyle = '#0c0816'; g.lineWidth = 2.5; g.strokeRect(0, 0, W, h);
  g.strokeStyle = '#6b4426'; g.lineWidth = 2; g.strokeRect(10, 10, W - 20, h - 20);

  g.textBaseline = 'alphabetic';
  let y = PAD;
  model.forEach((l, i) => {
    g.fillStyle = INK;
    switch (l.t) {
      case 'no':
        g.font = `11px ${latin}`; g.fillStyle = INK2; g.textAlign = 'center'; g.fillText(l.s, W / 2, y + 12); y += 18; break;
      case 'title':
        g.font = `26px ${disp}`; g.textAlign = 'center';
        wrapped[i].forEach((ln) => { g.fillText(ln, W / 2, y + 26); y += 32; }); y += 6; break;
      case 'swatch': {
        g.font = `bold 14px ${serif}`; g.textAlign = 'left';
        const tw = g.measureText(l.s).width; const x0 = W / 2 - (tw + 34) / 2;
        g.beginPath(); g.arc(x0 + 13, y + 18, 13, 0, Math.PI * 2); g.fillStyle = l.color; g.fill();
        g.lineWidth = 2; g.strokeStyle = '#0c0816'; g.stroke();
        g.fillStyle = INK; g.fillText(l.s, x0 + 34, y + 23); y += 36; break;
      }
      case 'swatch2': {
        g.font = `bold 13px ${serif}`;
        [[l.a, W * .27], [l.b, W * .73]].forEach(([sw, cx]) => {
          g.beginPath(); g.arc(cx, y + 18, 14, 0, Math.PI * 2); g.fillStyle = sw.color; g.fill();
          g.lineWidth = 2; g.strokeStyle = '#0c0816'; g.stroke();
          g.fillStyle = INK; g.textAlign = 'center'; g.fillText(sw.s, cx, y + 50);
        });
        g.font = `20px ${serif}`; g.fillText('→', W / 2, y + 25);
        y += 58; break;
      }
      case 'center':
        g.font = `${l.small ? 11 : 13}px ${l.small ? mono : serif}`; g.textAlign = 'center'; g.fillStyle = l.small ? INK2 : INK;
        g.fillText(l.s, W / 2, y + 14); y += 19; break;
      case 'hr':
        g.fillStyle = 'rgba(110,90,66,.6)';
        for (let x = PAD; x < W - PAD; x += 12) { g.beginPath(); g.arc(x, y + 9, 1.5, 0, Math.PI * 2); g.fill(); }
        y += 18; break;
      case 'sec':
        g.font = `16px ${disp}`; g.textAlign = 'left'; g.fillText(l.s, PAD, y + 18); y += 24; break;
      case 'row': {
        g.font = `${l.big ? 'bold 14px' : '13px'} ${mono}`; g.textAlign = 'left';
        let kx = PAD;
        if (l.dot) { g.beginPath(); g.arc(PAD + 5, y + 10, 4.5, 0, Math.PI * 2); g.fillStyle = l.dot; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#0c0816'; g.stroke(); g.fillStyle = INK; kx += 14; }
        g.fillText(l.k, kx, y + 15);
        const kw = g.measureText(l.k).width;
        g.font = `bold ${l.big ? 14 : 13}px ${mono}`;
        const vw = g.measureText(l.v).width;
        g.textAlign = 'right'; g.fillText(l.v, W - PAD, y + 15);
        g.save(); g.strokeStyle = 'rgba(46,32,20,.45)'; g.setLineDash([1.5, 3]); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(kx + kw + 6, y + 12); g.lineTo(W - PAD - vw - 6, y + 12); g.stroke(); g.restore();
        y += 21; break;
      }
      case 'quote':
        g.font = `14px ${serif}`; g.textAlign = 'center';
        wrapped[i].forEach((ln) => { g.fillText(ln, W / 2, y + 17); y += 22; }); y += 8; break;
      case 'sigil':
        g.font = `28px ${serif}`; g.textAlign = 'center'; g.fillStyle = '#b3262e'; g.fillText('✶ ☾ ✶', W / 2, y + 32); y += 42; break;
    }
  });
  return c;
}
