import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnalysis } from '../js/parse.js';
import { SAMPLE_LONG as SAMPLE } from '../js/sample.js';

test('예시 처방을 전부 읽는다', () => {
  const r = parseAnalysis(SAMPLE);
  assert.equal(r.npc, '서도윤');
  assert.equal(r.pc, '유하');
  assert.equal(r.found, 18);
  assert.equal(r.items.health.pct, 81);
  assert.match(r.items.health.status, /기침/);
  assert.match(r.items.health.desc, /직업병/);
  assert.equal(r.items.aftermath.pct, 85);
  assert.deepEqual(r.items.attach.types, ['혼란형']);
  assert.equal(r.items.attach.pct, 70);
  assert.match(r.deepest.title, /붙잡을 수는/);
  assert.match(r.deepest.body, /쓸모/);
});

test('굵게·번호·콜론 변형', () => {
  const r = parseAnalysis(`
1. **건강 염려도**: 40%
   - **상태값:** 괜찮다.
   - **설명:** 첫 줄
     둘째 줄
## 통제상실 불안도 — 12 %
* 상태값 : 멀쩡
* 설명 : 설명
**가장 깊은 불안: 말 못한 것**
`);
  assert.equal(r.items.health.pct, 40);
  assert.equal(r.items.health.status, '괜찮다.');
  assert.equal(r.items.health.desc, '첫 줄\n둘째 줄');
  assert.equal(r.items.control.pct, 12);
  assert.equal(r.deepest.body, '말 못한 것');
});

test('설명 속 "인정하기 싫어" 문장은 깊은 불안으로 읽지 않는다', () => {
  const r = parseAnalysis(`* 유기 불안도 50%
   * 상태값: a
   * 설명: 그는 이 감정을 인정하기 싫어하며 오랫동안 혼자 버텨 왔고 그것이 익숙해졌다고 믿는다.`);
  assert.equal(r.deepest, null);
  assert.match(r.items.abandon.desc, /인정하기 싫어/);
});

test('빈 입력', () => {
  assert.equal(parseAnalysis('').found, 0);
});
