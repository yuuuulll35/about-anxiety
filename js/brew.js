// 솥 색 섞기, 물약 이름, 달의 위상. DOM 없이 순수 함수만 둔다(테스트 가능).

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

function rgb2hsl([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > .5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

export const hsl = (h, s, l) => `hsl(${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;

/**
 * 넣은 재료들의 색을 수치² 가중으로 색상환 위에서 평균낸다.
 * RGB 평균은 금방 진흙색이 되므로 색상만 평균내고 채도·명도는 다시 올린다.
 * @param {{color:string, pct:number|null}[]} parts
 * @returns {{h:number,s:number,l:number}|null}
 */
export function mixBrew(parts) {
  let x = 0, y = 0, wsum = 0, lsum = 0;
  for (const p of parts) {
    const w = ((p.pct ?? 50) / 100) ** 2 + .02;
    const [h, s, l] = rgb2hsl(hex2rgb(p.color));
    const r = w * Math.max(s, .2);
    x += Math.cos(h * Math.PI / 180) * r;
    y += Math.sin(h * Math.PI / 180) * r;
    wsum += w; lsum += l * w;
  }
  if (!wsum) return null;
  const h = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const strength = Math.min(1, Math.hypot(x, y) / wsum); // 색이 한쪽으로 몰릴수록 1
  return { h, s: .35 + strength * .5, l: Math.min(.62, Math.max(.42, lsum / wsum)) };
}

export function colorName({ h, s }) {
  if (s < .42) return '잿빛';
  if (h < 15 || h >= 345) return '핏빛';
  if (h < 40) return '호박빛';
  if (h < 65) return '금빛';
  if (h < 150) return '독초빛';
  if (h < 195) return '청록빛';
  if (h < 250) return '심해빛';
  if (h < 290) return '보랏빛';
  return '장밋빛';
}

const hasJong = (w) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
export const wa = (w) => w + (hasJong(w) ? '과' : '와');
/** 받침에 맞는 조사: josa('유하', '이', '가') → '유하가' */
export const josa = (w, withJong, without) => w + (hasJong(w) ? withJong : without);

/** 가장 진한 재료 둘로 물약 이름을 짓는다 */
export function potionName(ranked) {
  const nouns = ranked.slice(0, 2).map((d) => d.ing.split(' ').pop());
  if (!nouns.length) return '이름 없는 물약';
  if (nouns.length === 1) return `${nouns[0]}의 묘약`;
  return `${wa(nouns[0])} ${nouns[1]}의 묘약`;
}

/** 0 삭 ~ 7 그믐 */
export function moonPhase(date = new Date()) {
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - ref) / 86400000;
  const age = ((days % 29.530588) + 29.530588) % 29.530588;
  const i = Math.round(age / 29.530588 * 8) % 8;
  return { i, label: ['삭', '초승달', '상현달', '차오르는 달', '보름달', '기우는 달', '하현달', '그믐달'][i], icon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'][i] };
}

export function witchRank(guessed, hits) {
  if (!guessed) return '비교 없이 부은 손';
  const r = hits / guessed;
  if (guessed >= 6 && r === 1) return '대마녀';
  if (r >= .75) return '숙련 마녀';
  if (r >= .5) return '견습 마녀';
  if (r >= .25) return '솥 닦는 수습생';
  return '솥을 처음 본 사람';
}
