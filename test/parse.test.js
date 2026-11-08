import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAnalysis } from '../js/parse.js';
import { SAMPLE_LONG as SAMPLE } from '../js/sample.js';

test('예시 처방을 전부 읽는다', () => {
  const r = parseAnalysis(SAMPLE);
  assert.equal(r.npc, '서도윤');
  assert.equal(r.pc, '유하');
  assert.equal(r.found, 18);
  assert.equal(r.items.looks.pct, 62);
  assert.match(r.items.looks.status, /피곤한/);
  assert.match(r.items.looks.desc, /관찰 습관/);
  assert.equal(r.items.danger.pct, 23);
  assert.deepEqual(r.items.attach.types, ['챙겨 주기']);
  assert.equal(r.items.attach.pct, 70);
  assert.match(r.deepest.title, /보고 싶어서/);
  assert.match(r.deepest.body, /쓸모/);
});

test('굵게·번호·콜론 변형', () => {
  const r = parseAnalysis(`
1. **외모 끌림**: 40%
   - **상태값:** 괜찮다.
   - **설명:** 첫 줄
     둘째 줄
## 편안함끌림 — 12 %
* 상태값 : 멀쩡
* 설명 : 설명
**가장 깊은 불안: 말 못한 것**
`);
  assert.equal(r.items.looks.pct, 40);
  assert.equal(r.items.looks.status, '괜찮다.');
  assert.equal(r.items.looks.desc, '첫 줄\n둘째 줄');
  assert.equal(r.items.ease.pct, 12);
  assert.equal(r.deepest.body, '말 못한 것');
});

test('설명 속 "인정하기 싫어" 문장은 하지 못한 말로 읽지 않는다', () => {
  const r = parseAnalysis(`* 손길 끌림 50%
   * 상태값: a
   * 설명: 그는 이 감정을 인정하기 싫어하며 오랫동안 혼자 버텨 왔고 그것이 익숙해졌다고 믿는다.`);
  assert.equal(r.deepest, null);
  assert.match(r.items.touch.desc, /인정하기 싫어/);
});

test('빈 입력', () => {
  assert.equal(parseAnalysis('').found, 0);
});
