// 조제 내역서: 한 모델에서 HTML 과 저장용 캔버스를 함께 만든다.
import { ANXIETY, HIDDEN } from './items.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function titleFor(guessed, hits) {
  if (!guessed) return '짐작 없이 뜯은 손';
  const r = hits / guessed;
  if (guessed >= 6 && r === 1) return '전담 약사';
  if (r >= .75) return '단골 약사';
  if (r >= .5) return '수습 약사';
  if (r >= .25) return '견습생';
  return '처방전을 처음 본 사람';
}

export function receiptModel({ data, npc, pc, date, guessed, hits }) {
  const L = [];
  L.push({ t: 'title', s: '속마음 조제실' });
  L.push({ t: 'center', s: 'UNSAID PHARMACY · 조제 내역서' });
  L.push({ t: 'hr' });
  L.push({ t: 'row', k: '조제일', v: date });
  L.push({ t: 'row', k: '환자', v: npc });
  if (pc) L.push({ t: 'row', k: '보호자', v: pc });
  L.push({ t: 'hr' });
  L.push({ t: 'text', s: '[의식 아래 불안]', b: true });
  const pcts = [];
  for (const d of ANXIETY) {
    const it = data.items[d.key];
    const v = it && it.pct != null ? it.pct : null;
    if (v != null) pcts.push([d.name, v]);
    L.push({ t: 'row', k: d.name, v: v == null ? '—' : v + '%', bar: v });
  }
  L.push({ t: 'hr' });
  L.push({ t: 'text', s: '[엑스레이 판독]', b: true });
  for (const d of HIDDEN) {
    const it = data.items[d.key];
    let v = '—';
    if (it) {
      if (d.key === 'attach' && it.types && it.types.length) v = it.types.join('·') + (it.pct != null ? ' ' + it.pct + '%' : '');
      else if (it.pct != null) v = it.pct + '%';
      else v = '판독';
    }
    L.push({ t: 'row', k: d.name, v });
  }
  L.push({ t: 'hr' });
  if (pcts.length) {
    const avg = Math.round(pcts.reduce((a, [, v]) => a + v, 0) / pcts.length);
    const top = [...pcts].sort((a, b) => b[1] - a[1])[0];
    const low = [...pcts].sort((a, b) => a[1] - b[1])[0];
    L.push({ t: 'row', k: '평균 불안', v: avg + '%', big: true });
    L.push({ t: 'row', k: '최고 처방', v: `${top[0]} ${top[1]}%` });
    L.push({ t: 'row', k: '최저 처방', v: `${low[0]} ${low[1]}%` });
  }
  L.push({ t: 'row', k: '짐작 적중', v: guessed ? `${hits}/${guessed}` : '—' });
  L.push({ t: 'row', k: '약사 등급', v: titleFor(guessed, hits), big: true });
  if (data.deepest) {
    L.push({ t: 'hr' });
    L.push({ t: 'center', s: '가장 깊은 불안' });
    L.push({ t: 'quote', s: data.deepest.title || data.deepest.body.split('\n')[0].slice(0, 70) });
  }
  L.push({ t: 'hr' });
  L.push({ t: 'barcode' });
  L.push({ t: 'center', s: '자기 전, 혼자 있을 때 복용' });
  L.push({ t: 'center', s: '* 본 내역서는 진단서가 아닙니다 *', small: true });
  return L;
}

export function receiptHTML(model) {
  return model.map((l) => {
    switch (l.t) {
      case 'title': return `<div class="rc-c rc-title">${esc(l.s)}</div>`;
      case 'center': return `<div class="rc-c"${l.small ? ' style="font-size:11px"' : ''}>${esc(l.s)}</div>`;
      case 'hr': return '<hr class="rc-hr">';
      case 'text': return `<div${l.b ? ' style="font-weight:700"' : ''}>${esc(l.s)}</div>`;
      case 'row': return `<div class="rc-row${l.big ? ' rc-big' : ''}"><span class="k">${esc(l.k)}</span><span class="dots"></span><span class="v">${esc(l.v)}${l.bar != null ? `<span class="rc-bar" style="width:${Math.round(l.bar / 4)}px"></span>` : ''}</span></div>`;
      case 'quote': return `<p class="rc-quote">“${esc(l.s)}”</p>`;
      case 'barcode': return '<div class="rc-barcode"></div>';
      default: return '';
    }
  }).join('');
}

/** 저장용 PNG 캔버스 (352px 폭 × 2배) */
export function receiptCanvas(model) {
  const S = 2, W = 352, PAD = 18, M = 24; // M: 바깥 여백
  const mono = "'Nanum Gothic Coding', monospace";
  const disp = "'Do Hyeon', sans-serif";
  const serif = "'Gowun Batang', serif";
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

  // 1차: 높이 계산
  const H_OF = { title: 34, center: 20, hr: 20, text: 21, row: 21, barcode: 54 };
  let h = PAD;
  const quoteLines = {};
  model.forEach((l, i) => {
    if (l.t === 'quote') { quoteLines[i] = wrap(`“${l.s}”`, `14px ${serif}`, W - PAD * 2); h += quoteLines[i].length * 22 + 8; }
    else h += H_OF[l.t] || 20;
  });
  h += PAD + 14;

  c.width = (W + M * 2) * S; c.height = (h + M * 2) * S;
  g.scale(S, S);
  g.fillStyle = '#f4eddc'; g.fillRect(0, 0, W + M * 2, h + M * 2);
  g.translate(M, M);

  // 종이 + 톱니 아래끝
  g.fillStyle = 'rgba(0,0,0,.15)';
  g.beginPath(); g.rect(3, 3, W, h - 6); g.fill();
  g.fillStyle = '#fffefa';
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, h - 6);
  for (let x = W; x > 0; x -= 12) { g.arc(x - 6, h - 6, 6, 0, Math.PI, false); }
  g.lineTo(0, 0); g.closePath(); g.fill();

  g.fillStyle = '#222'; g.textBaseline = 'alphabetic';
  let y = PAD;
  model.forEach((l, i) => {
    switch (l.t) {
      case 'title':
        g.font = `24px ${disp}`; g.textAlign = 'center'; g.fillText(l.s, W / 2, y + 26); y += 34; break;
      case 'center':
        g.font = `${l.small ? 11 : 13}px ${mono}`; g.textAlign = 'center'; g.fillText(l.s, W / 2, y + 15); y += 20; break;
      case 'hr':
        g.save(); g.strokeStyle = '#555'; g.setLineDash([4, 3]); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(PAD, y + 10); g.lineTo(W - PAD, y + 10); g.stroke(); g.restore(); y += 20; break;
      case 'text':
        g.font = `${l.b ? 'bold ' : ''}13px ${mono}`; g.textAlign = 'left'; g.fillText(l.s, PAD, y + 15); y += 21; break;
      case 'row': {
        g.font = `${l.big ? 'bold 14px' : '13px'} ${mono}`;
        g.textAlign = 'left'; g.fillText(l.k, PAD, y + 15);
        const kw = g.measureText(l.k).width;
        g.font = `bold ${l.big ? 14 : 13}px ${mono}`;
        const barW = l.bar != null ? Math.round(l.bar / 4) + 4 : 0;
        const vw = g.measureText(l.v).width;
        g.textAlign = 'right'; g.fillText(l.v, W - PAD - barW, y + 15);
        if (barW) { g.fillRect(W - PAD - barW + 4, y + 7, barW - 4, 6); }
        g.save(); g.strokeStyle = '#999'; g.setLineDash([1.5, 3]); g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(PAD + kw + 6, y + 12); g.lineTo(W - PAD - barW - vw - 6, y + 12); g.stroke(); g.restore();
        y += 21; break;
      }
      case 'quote':
        g.font = `14px ${serif}`; g.textAlign = 'center';
        quoteLines[i].forEach((ln) => { g.fillText(ln, W / 2, y + 17); y += 22; });
        y += 8; break;
      case 'barcode': {
        const bw = W * .8, x0 = (W - bw) / 2; let x = x0; let k = 0;
        const pat = [2, 1, 1, 3, 3, 1, 2, 2, 1, 1, 3, 2];
        while (x < x0 + bw) { const w = pat[k % pat.length]; if (k % 2 === 0) g.fillRect(x, y + 8, w, 40); x += w; k++; }
        y += 54; break;
      }
    }
  });
  return c;
}
