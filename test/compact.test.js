import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnalysis } from '../js/parse.js';
import { SAMPLE } from '../js/sample.js';
import { ANXIETY, HIDDEN } from '../js/items.js';

// 긴 예시를 짧은 물약 코드로 바꿔 같은 결과가 나오는지 본다
function toCompact(r) {
  const L = ['[POTION]', `NPC=${r.npc}|PC=${r.pc}`];
  ANXIETY.forEach((d, i) => { const it = r.items[d.key]; L.push(`A${String(i + 1).padStart(2, '0')}=${it.pct}|${it.status}|${it.desc.replace(/\n/g, ' ')}`); });
  HIDDEN.forEach((d, i) => {
    const it = r.items[d.key];
    const head = d.key === 'attach' ? `${it.types[0]} ${it.pct}` : it.pct;
    L.push(`H${String(i + 1).padStart(2, '0')}=${head}|${it.status}|${it.desc.replace(/\n/g, ' ')}`);
  });
  L.push(`DEEP=${r.deepest.title}|${r.deepest.body.replace(/\n/g, ' ')}`, '[/POTION]');
  return L.join('\n');
}

test('짧은 물약 코드를 긴 형식과 같게 읽는다', () => {
  const long = parseAnalysis(SAMPLE);
  const code = toCompact(long);
  const r = parseAnalysis(code);
  assert.equal(r.found, 18);
  assert.equal(r.npc, '서도윤'); assert.equal(r.pc, '유하');
  for (const d of [...ANXIETY, ...HIDDEN]) {
    assert.equal(r.items[d.key].pct, long.items[d.key].pct, d.key);
    assert.equal(r.items[d.key].status, long.items[d.key].status, d.key);
  }
  assert.deepEqual(r.items.attach.types, ['혼란형']);
  assert.equal(r.deepest.title, long.deepest.title);
  assert.ok(code.length < SAMPLE.length * .9, `코드 ${code.length}자 / 긴 형식 ${SAMPLE.length}자`);
});

test('앞뒤 잡담, 굵게, 마커 없음, 콜론, % 기호도 읽는다', () => {
  const r = parseAnalysis(`네, 분석 결과입니다!
**A01**: 72%|걱정이 많다|늘 확인한다
A2=40|덤덤하다|크게 신경 쓰지 않는다
A03 = 88 | 버려질까 무섭다 | 연락이 끊기면 불안하다
A04=10|a|b
A05=20|a|b
A06=30|a|b
H03=회피형 55|거리를 둔다|가까워지면 물러난다
DEEP=사실은 혼자가 무섭다|오래 혼자였기 때문이다.
이상입니다.`);
  assert.equal(r.found, 7);
  assert.equal(r.items.health.pct, 72);
  assert.equal(r.items.health.status, '걱정이 많다');
  assert.equal(r.items.affair.pct, 40);
  assert.equal(r.items.abandon.desc, '연락이 끊기면 불안하다');
  assert.deepEqual(r.items.attach.types, ['회피형']);
  assert.equal(r.deepest.title, '사실은 혼자가 무섭다');
});

test('코드 줄이 적으면 긴 형식으로 읽는다', () => {
  const r = parseAnalysis(SAMPLE);
  assert.equal(r.found, 18);
});
