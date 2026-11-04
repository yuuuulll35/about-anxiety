import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnalysis } from '../js/parse.js';
import { encode, decode, ROWS, CHARSET, levelToPct } from '../js/codebook.js';
import { SAMPLE } from '../js/sample.js';
import { OOC_PARTS, OOC_STEPS, INPUT_LIMIT } from '../js/prompt.js';

test('표는 자리마다 10개 서로 다른 허용 문자', () => {
  assert.equal(ROWS.length, 18);
  for (const r of ROWS) {
    assert.equal(new Set(r).size, 10);
    for (const c of r) assert.ok(CHARSET.includes(c), c);
  }
});

test('인코딩 ↔ 디코딩', () => {
  const lv = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 9, 8, 7, 6, 5, 4, 3, 2];
  const d = decode(encode(lv, '회피형', 'Z'));
  assert.deepEqual(d.levels, lv);
  assert.equal(d.type, '회피형');
  assert.deepEqual(d.fuzzy, []);
});

test('나눠 받은 답 세 개를 이어 붙인 예시를 모두 읽는다', () => {
  const r = parseAnalysis(SAMPLE);
  assert.equal(r.letters, true);
  assert.equal(r.found, 18);
  assert.equal(r.items.health.pct, 85);
  assert.match(r.items.health.status, /응급실/);
  assert.deepEqual(r.items.attach.types, ['혼란형']);
  assert.match(r.deepest.title, /붙잡을 수는/);
  assert.match(r.deepest.body, /쓸모/);
});

test('답 하나만 붙여넣어도 그 항목만 읽는다', async () => {
  const { SAMPLE_PARTS } = await import('../js/sample.js');
  const r = parseAnalysis(SAMPLE_PARTS[1]);
  assert.equal(r.found, 6);
  assert.deepEqual(r.codes, ['A07', 'A08', 'A09', 'A10', 'A11', 'A12']);
});

test('표에 없는 문자는 그 항목만 4로', () => {
  const r = parseAnalysis('A01 Z | 상태 | 설명\nA02 W | 상태 | 설명');
  assert.equal(r.items.health.uncertain, true);
  assert.equal(r.items.health.pct, levelToPct(4));
  assert.equal(r.items.affair.pct, levelToPct(8));
});

test('구분자 없이, 소문자, 공백 섞여도 읽는다', () => {
  const code = encode(Array(18).fill(7), '불안형').replace(/-/g, ' ').toLowerCase();
  const r = parseAnalysis(code);
  assert.equal(r.items.burden.pct, levelToPct(7));
  assert.deepEqual(r.items.attach.types, ['불안형']);
});

test('표에 없는 문자 몇 칸은 그 칸만 4로, 많으면 오류', () => {
  const ok = encode(Array(18).fill(9), '안정형');
  const s = ok.replace('MUL-', '');
  const bad2 = 'MUL-' + 'O' + s.slice(1, 3) + 'I' + s.slice(4);
  const r = parseAnalysis(bad2);
  assert.equal(r.items.health.pct, levelToPct(4));
  assert.equal(r.items.health.uncertain, true);
  assert.equal(r.items.asym.pct, levelToPct(9));
  const bad = 'MUL-OOOO-OOOO' + ok.slice(13);
  assert.equal(parseAnalysis(bad).error, 'ERR_SIGNAL');
});

test('줄에 수치를 붙여 와도 상태값만 남긴다', () => {
  const r = parseAnalysis(encode(Array(18).fill(5), '안정형') + '\nA01: 70|걱정이 많다\n**A02** 덤덤하다');
  assert.equal(r.items.health.status, '걱정이 많다');
  assert.equal(r.items.affair.status, '덤덤하다');
  assert.equal(r.items.health.pct, levelToPct(5));
});

test('주문 조각은 각각 입력 제한 안이고, 혼자서 완결된다', () => {
  assert.equal(OOC_PARTS.length, 3);
  for (const p of OOC_PARTS) {
    assert.ok([...p].length <= INPUT_LIMIT, `${[...p].length}자`);
    assert.match(p, /근거 없는 수치나 억지스러운 심리 해석은 금지/);
    assert.match(p, /0=Q 1=7/);
    assert.doesNotMatch(p, /준비됨/);
    assert.equal((p.match(/^[AH]\d\d .+: .+/gm) || []).length, 6);
  }
  assert.match(OOC_PARTS[2], /혼란형=J/);
  assert.match(OOC_PARTS[2], /DEEP/);
  assert.equal(OOC_STEPS.flatMap((s) => s.expect).length, 19);
});

test('상태값 | 설명 을 둘 다 읽는다', () => {
  const r = parseAnalysis(SAMPLE);
  assert.match(r.items.health.desc, /직업병/);
  assert.match(r.items.health.status, /응급실/);
});
