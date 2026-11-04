// AI 답변(마크다운 섞인 자유 텍스트)을 항목 단위로 읽는다.
// 기대 형식:
//   * 건강 염려도 72%
//      * 상태값: ...
//      * 설명: ...
// 굵게(**), 번호(1.), 글머리(- * • ·), 제목(#), 콜론 위치가 달라도 읽는다.

import { ANXIETY, HIDDEN, ATTACH_TYPES } from './items.js';

const compact = (s) => s.replace(/[\s*_`~:：\[\]【】()（）'"“”‘’]/g, '');

// 줄 머리의 글머리·번호·굵게·인용 기호를 벗긴다.
function stripLead(line) {
  return line
    .replace(/^\s*(?:>\s*)*/, '')
    .replace(/^(?:[-*+•·▪◦●○■□▶►▷✦✧★☆]\s*)+/, '')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\(?\d{1,2}[.)]\s+/, '')
    .replace(/^(?:[-*+•·]\s*)+/, '')
    .trim();
}

const clean = (s) => s.replace(/\*\*|__/g, '').replace(/^\s*[:：\-–—]\s*/, '').trim();

const ALL = [
  ...ANXIETY.map((d) => ({ ...d, group: 'anxiety' })),
  ...HIDDEN.map((d) => ({ ...d, group: 'hidden' })),
].map((d) => ({ ...d, c: d.aliases.map(compact).sort((a, b) => b.length - a.length) }));

function matchItem(body) {
  const c = compact(body);
  let best = null;
  for (const d of ALL) {
    for (const a of d.c) {
      if (c.startsWith(a) && (!best || a.length > best.len)) best = { def: d, len: a.length };
    }
  }
  return best && best.def;
}

const DEEP_RE = /(DEEPEST|가장\s*깊은\s*불안|가장\s*깊은\s*곳|인정하기\s*싫어)/i;
const NPC_RE = /^\[?\s*(?:NPC|분석\s*대상|대상)\s*\]?\s*[:：]?\s*(.+)$/i;
const PC_RE = /^\[?\s*PC\s*\]?\s*[:：]?\s*(.+)$/i;

/**
 * @param {string} raw
 * @returns {{npc:string|null, pc:string|null, items:Record<string, any>, deepest:{title:string, body:string}|null, found:number}}
 */
/* 짧은 물약 코드:  A01=81|상태값|설명 · H03=혼란형 70|… · NPC=…|PC=… · DEEP=…|… */
const CODE_RE = /^\s*[*\-•>]*\s*\**\s*(A|H)\s*0?(\d{1,2})\s*\**\s*[=:：]\s*(.+)$/i;
function parseCompact(text) {
  const items = {};
  let npc = null, pc = null, deepest = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\*\*/g, '').trim();
    if (!line) continue;
    const who = line.match(/^NPC\s*[=:：]\s*([^|]+?)\s*(?:\|\s*PC\s*[=:：]\s*(.+))?$/i);
    if (who) { npc = who[1].trim() || null; pc = who[2] ? who[2].trim() || null : pc; continue; }
    const pcl = line.match(/^PC\s*[=:：]\s*(.+)$/i);
    if (pcl) { pc = pcl[1].trim(); continue; }
    const dp = line.match(/^DEEP\s*[=:：]\s*(.+)$/i);
    if (dp) {
      const [t, ...rest] = dp[1].split('|').map((x) => x.trim());
      deepest = rest.length ? { title: t.replace(/^["“'‘]|["”'’]$/g, ''), body: rest.join(' ') } : { title: '', body: t };
      continue;
    }
    const m = line.match(CODE_RE);
    if (!m) continue;
    const list = m[1].toUpperCase() === 'A' ? ANXIETY : HIDDEN;
    const def = list[+m[2] - 1];
    if (!def) continue;
    const [head, status = '', ...desc] = m[3].split('|').map((x) => x.trim());
    const n = head.match(/(\d{1,3}(?:\.\d+)?)/);
    const tag = head.replace(/\d{1,3}(?:\.\d+)?\s*%?/, '').trim() || null;
    const it = {
      key: def.key, group: list === ANXIETY ? 'anxiety' : 'hidden', name: def.name,
      pct: n ? Math.max(0, Math.min(100, Math.round(parseFloat(n[1])))) : null,
      tag, status, desc: desc.join(' | '),
    };
    if (def.key === 'attach') {
      const hay = [tag, status, it.desc].join(' ');
      const inTag = ATTACH_TYPES.filter((t) => (tag || '').includes(t));
      it.types = inTag.length ? inTag : ATTACH_TYPES.filter((t) => hay.includes(t)).slice(0, 1);
    }
    items[def.key] = it;
  }
  return { npc, pc, items, deepest, found: Object.keys(items).length };
}

export function parseAnalysis(raw) {
  const compact = parseCompact(String(raw || '').replace(/\r\n?/g, '\n').replace(/```[a-z]*\n?/gi, ''));
  if (compact.found >= 6) return compact;
  return parseLong(raw);
}

function parseLong(raw) {
  const text = String(raw || '')
    .replace(/\r\n?/g, '\n')
    .replace(/```[a-z]*\n?/gi, '');
  const lines = text.split('\n');

  const items = {};
  let npc = null;
  let pc = null;
  let cur = null; // 현재 항목
  let field = null; // 'status' | 'desc'
  let deep = null; // {lines:[]}

  for (const rawLine of lines) {
    const line = stripLead(rawLine);
    if (!line) continue;
    const plain = clean(line);

    // [NPC] 이름 / [PC] 이름  (한 줄에 둘 다 있을 수도)
    if (!cur && !deep) {
      const both = plain.match(/NPC\s*\]?\s*[:：]?\s*([^/|·]+?)\s*[/|·]\s*\[?\s*PC\s*\]?\s*[:：]?\s*(.+)$/i);
      if (both) { npc = both[1].trim(); pc = both[2].trim(); continue; }
      const n = plain.match(NPC_RE);
      if (n && n[1].length <= 30) { npc = n[1].trim(); continue; }
      const p = plain.match(PC_RE);
      if (p && p[1].length <= 30) { pc = p[1].trim(); continue; }
    }

    // 가장 깊은 불안 구역 시작: 제목처럼 생긴 줄에서만 (설명 속 문장은 무시)
    const headish = plain.length <= 45 || /^\[?\s*(DEEPEST|가장\s*깊은)/i.test(plain);
    if (headish && DEEP_RE.test(plain) && !/^(상태값|설명)/.test(plain)) {
      cur = null; field = null;
      deep = { lines: [] };
      // "가장 깊은 불안: 내용" 처럼 같은 줄에 내용이 있으면 살린다
      const ci = plain.search(/[:：]/);
      if (ci > -1 && DEEP_RE.test(plain.slice(0, ci))) {
        const after = plain.slice(ci + 1).trim();
        if (after) deep.lines.push(after);
      }
      continue;
    }
    if (deep) {
      // 깊은 불안 뒤에 다시 대괄호 제목이 나오면 끝
      if (/^\[[A-Z _]+\]$/.test(plain)) { deep.done = true; continue; }
      if (!deep.done) deep.lines.push(plain.replace(/^(상태값|설명|제목|내용)\s*[:：]\s*/, ''));
      continue;
    }

    // 대괄호 섹션 제목은 건너뛴다
    if (/^\[[^\]]+\]$/.test(plain)) { cur = null; field = null; continue; }

    // 상태값 / 설명
    const sv = plain.match(/^(상태값|상태|State)\s*[:：]\s*(.*)$/i);
    if (sv && cur) { cur.status = clean(sv[2]); field = 'status'; continue; }
    const ds = plain.match(/^(설명|해설|Description)\s*[:：]\s*(.*)$/i);
    if (ds && cur) { cur.desc = clean(ds[2]); field = 'desc'; continue; }

    // 새 항목 머리
    const def = matchItem(plain);
    if (def && plain.length <= 80) {
      const pct = plain.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
      // 머리 뒤에 붙은 꼬리(예: "애착 유형 불안형 70%")
      const tail = plain
        .replace(/\d{1,3}(?:\.\d+)?\s*%/, '')
        .replace(new RegExp('^\\s*' + def.name.replace(/\s+/g, '\\s*')), '')
        .replace(/^[\s:：\-–—|]+/, '')
        .trim();
      cur = {
        key: def.key,
        group: def.group,
        name: def.name,
        pct: pct ? Math.max(0, Math.min(100, Math.round(parseFloat(pct[1])))) : null,
        tag: tail || null,
        status: '',
        desc: '',
      };
      items[def.key] = cur;
      field = null;
      continue;
    }

    // 이어지는 줄
    if (cur) {
      if (field === 'status') cur.status += ' ' + plain;
      else if (field === 'desc') cur.desc += (cur.desc ? '\n' : '') + plain;
      else cur.desc += (cur.desc ? '\n' : '') + plain;
    }
  }

  // 애착 유형 이름 찾기
  const at = items.attach;
  if (at) {
    // 머리 줄에 적힌 유형이 우선. 없으면 본문에서 가장 먼저 나온 유형 하나.
    const inTag = ATTACH_TYPES.filter((t) => (at.tag || '').includes(t));
    if (inTag.length) at.types = inTag;
    else {
      const hay = [at.status, at.desc].join(' ');
      const hits = ATTACH_TYPES.map((t) => [t, hay.indexOf(t)]).filter(([, i]) => i > -1).sort((a, b) => a[1] - b[1]);
      at.types = hits.length ? [hits[0][0]] : [];
    }
  }

  let deepest = null;
  if (deep && deep.lines.length) {
    const ls = deep.lines.map((l) => l.trim()).filter(Boolean);
    if (ls.length > 1 && ls[0].length <= 60) deepest = { title: ls[0].replace(/^["“'‘]|["”'’]$/g, ''), body: ls.slice(1).join('\n') };
    else deepest = { title: '', body: ls.join('\n') };
  }

  const found = Object.keys(items).length;
  return { npc, pc, items, deepest, found };
}
