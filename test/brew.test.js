import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mixBrew, colorName, potionName, wa, moonPhase, witchRank } from '../js/brew.js';
import { ANXIETY } from '../js/items.js';

test('한 가지 재료면 그 색상 그대로', () => {
  const b = mixBrew([{ color: '#e0413b', pct: 90 }]);
  assert.ok(b.h < 5 || b.h > 355);
  assert.equal(colorName(b), '핏빛');
});

test('진한 재료가 색을 주도한다', () => {
  const b = mixBrew([{ color: '#3f5fe0', pct: 95 }, { color: '#f2c84b', pct: 10 }]);
  assert.equal(colorName(b), '심해빛');
});

test('빈 솥', () => assert.equal(mixBrew([]), null));

test('조사 과/와', () => {
  assert.equal(wa('연기'), '연기와');
  assert.equal(wa('뿌리'), '뿌리와');
  assert.equal(wa('별가루'), '별가루와');
  assert.equal(wa('저울추'), '저울추와');
  assert.equal(wa('발소리'), '발소리와');
  assert.equal(wa('모래'), '모래와');
  assert.equal(wa('깃털'), '깃털과');
});

test('물약 이름', () => {
  const d = (k) => ANXIETY.find((x) => x.key === k);
  assert.equal(potionName([d('ease'), d('kind')]), '담요와 찻잔의 묘약');
  assert.equal(potionName([d('fragile'), d('danger')]), '유리구슬과 장미의 묘약');
});

test('달의 위상: 2024-01-11 은 삭, 2024-01-25 는 보름', () => {
  assert.equal(moonPhase(new Date(Date.UTC(2024, 0, 11, 12))).label, '삭');
  assert.equal(moonPhase(new Date(Date.UTC(2024, 0, 25, 18))).label, '보름달');
});

test('마녀 등급', () => {
  assert.equal(witchRank(0, 0), '비교 없이 부은 손');
  assert.equal(witchRank(12, 12), '대마녀');
  assert.equal(witchRank(4, 3), '숙련 마녀');
  assert.equal(witchRank(10, 1), '솥을 처음 본 사람');
});
