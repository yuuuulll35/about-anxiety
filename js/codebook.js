// 물약 코드 MUL-XXXX-XXXX-XXXX-XXXX-XXXX
// 자리 1~12: A01~A12 단계(0~9), 13~18: H01~H06 단계, 19: 사랑의 언어, 20: 임의 문자.
// 각 자리 표의 index = 단계. 채팅에서는 수치가 보이지 않고 사이트에서만 풀린다.
import { ANXIETY, HIDDEN } from './items.js?v=20';

export const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // O I L 0 1 제외
// 모든 자리가 같은 표를 쓴다 (OOC 를 1,500자 안에 넣기 위해)
export const ROW = 'Q7MRXK9BWT';
export const ROWS = Array(18).fill(ROW);
export const TYPE_CODE = { '다정한 말': 'W', '함께하는 시간': 'T', 선물: 'G', '챙겨 주기': 'C', 스킨십: 'S' };
const TYPE_OF = Object.fromEntries(Object.entries(TYPE_CODE).map(([k, v]) => [v, k]));
export const SLOTS = [
  ...ANXIETY.map((d, i) => ({ code: `A${String(i + 1).padStart(2, '0')}`, def: d })),
  ...HIDDEN.map((d, i) => ({ code: `H${String(i + 1).padStart(2, '0')}`, def: d })),
];

/** 단계 0~9 → 화면 수치 5~95% */
export const levelToPct = (lv) => lv * 10 + 5;
export const MAX_FUZZY = 4;

/** levels: 18개 0~9, type: '스킨십' 등 */
export function encode(levels, type, noise = 'Q') {
  const chars = levels.map((lv, i) => ROWS[i][lv]);
  chars.push(TYPE_CODE[type] || 'S', noise);
  const s = chars.join('');
  return `MUL-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}`;
}

/**
 * 텍스트 어디에 있든 MUL 코드를 찾아 푼다. 표에 없는 문자는 그 자리만 4(근거 부족)로 읽는다.
 * @returns {{levels:number[], fuzzy:number[], type:string|null}|{error:string}|null}
 */
export function decode(text) {
  const m = String(text || '').toUpperCase().match(/MUL[\s\-–—_:]*((?:[A-Z0-9][\s\-–—_]*){19,20})/);
  if (!m) return null;
  const s = m[1].replace(/[^A-Z0-9]/g, '');
  if (s.length < 19) return { error: 'ERR_FORMAT' };
  const levels = [], fuzzy = [];
  for (let i = 0; i < 18; i++) {
    const lv = ROWS[i].indexOf(s[i]);
    if (lv < 0) { levels.push(4); fuzzy.push(i); } else levels.push(lv);
  }
  if (fuzzy.length > MAX_FUZZY) return { error: 'ERR_SIGNAL', fuzzy };
  return { levels, fuzzy, type: TYPE_OF[s[18]] || null };
}

