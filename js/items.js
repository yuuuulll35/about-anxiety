// OOC 항목 정의. name 은 화면 표기, aliases 는 파서가 줄 머리에서 찾는 이름(공백 무시).
// ing/color 는 솥에 넣는 재료(불안 12종), vision 은 연기 속 환영(숨겨진 심리 6종).

export const ANXIETY = [
  { key: 'health',    short: '건강 염려', q: '{P가} 아프거나 다칠까 봐 걱정하는 마음', name: '건강 염려도',       ing: '식지 않는 체온계',   color: '#5fd3c4', hint: 'PC의 건강과 안전에 대한 걱정',          aliases: ['건강 염려도', '건강 염려', '건강염려도'] },
  { key: 'affair',    short: '외도', q: '{P가} 다른 사람에게 마음을 줄까 봐 두려운 마음', name: '외도 불안도',       ing: '낯선 향수 한 방울',  color: '#ff7fbf', hint: '다른 사람에게 마음을 빼앗길 두려움',     aliases: ['외도 불안도', '외도 불안'] },
  { key: 'abandon',   short: '유기', q: '{P에게} 버려질까 봐 무서운 마음', name: '유기 불안도',       ing: '멀어지는 발소리',    color: '#3f5fe0', hint: '버려지거나 관계가 끝날 공포',           aliases: ['유기 불안도', '유기 불안'] },
  { key: 'replace',   short: '대체', q: '자기보다 나은 사람이 나타날까 봐 불안한 마음', name: '대체 불안도',       ing: '더 밝은 별가루',     color: '#f2c84b', hint: '더 좋은 사람이 나타날 것이라는 불안',     aliases: ['대체 불안도', '대체 불안'] },
  { key: 'asym',      short: '애정 비대칭', q: '자기만 더 좋아하는 것 같아 서운한 마음', name: '애정 비대칭 불안도', ing: '기울어진 저울추',    color: '#d9843f', hint: '자신만큼 사랑받지 못할지도 모른다는 걱정', aliases: ['애정 비대칭 불안도', '애정비대칭 불안도', '애정 비대칭 불안', '애정 비대칭'] },
  { key: 'depend',    short: '의존', q: '{P에게} 너무 기대게 될까 봐 겁나는 마음', name: '의존 불안도',       ing: '얽힌 덩굴 뿌리',     color: '#6fcf4a', hint: '지나치게 의지하는 것에 대한 두려움',     aliases: ['의존 불안도', '의존 불안'] },
  { key: 'intimacy',  short: '친밀감', q: '가까워질수록 약점을 들킬까 봐 불안한 마음', name: '친밀감 불안도',     ing: '금 간 가면 조각',    color: '#e9e2ff', hint: '가까워질수록 본모습을 들키는 불안',      aliases: ['친밀감 불안도', '친밀감 불안', '친밀 불안도'] },
  { key: 'control',   short: '통제 상실', q: '관계가 마음대로 안 될까 봐 초조한 마음', name: '통제 상실 불안도',   ing: '거꾸로 흐르는 모래',  color: '#f08a5d', hint: '관계의 흐름을 통제하지 못하는 불안',     aliases: ['통제 상실 불안도', '통제상실 불안도', '통제 상실 불안', '통제 상실'] },
  { key: 'conflict',  short: '갈등', q: '싸우면 관계가 깨질까 봐 두려운 마음', name: '갈등 불안도',       ing: '깨진 찻잔 파편',     color: '#e0413b', hint: '다툼으로 관계가 손상될 두려움',         aliases: ['갈등 불안도', '갈등 불안'] },
  { key: 'future',    short: '미래', q: '이 관계가 계속될 수 있을지 걱정되는 마음', name: '미래 불안도',       ing: '흐린 수정구 안개',   color: '#a98bff', hint: '관계가 지속될 수 있을지에 대한 걱정',     aliases: ['미래 불안도', '미래 불안'] },
  { key: 'burden',    short: '부담감', q: '자기가 {P에게} 짐이 될까 봐 미안한 마음', name: '부담감 불안도',     ing: '비에 젖은 깃털',     color: '#7fa7c9', hint: 'PC에게 짐이 될지도 모른다는 염려',       aliases: ['부담감 불안도', '부담감 불안', '부담 불안도'] },
  { key: 'aftermath', short: '상실 후유증', q: '{P를} 잃으면 일상이 무너질 것 같은 마음', name: '상실 후유증 불안도', ing: '꺼진 촛불의 연기',   color: '#8a6aa8', hint: 'PC를 잃은 뒤 일상이 무너질 공포',       aliases: ['상실 후유증 불안도', '상실후유증 불안도', '상실 후유증 불안', '상실 후유증'] },
];

export const HIDDEN = [
  { key: 'possess',  name: '무의식적 소유욕', vision: '움켜쥔 손',     hint: 'PC를 자신의 영역으로 인식하는 정도', aliases: ['무의식적 소유욕', '무의식 소유욕', '소유욕'] },
  { key: 'vulner',   name: '감정적 취약성',   vision: '금 간 심장',    hint: 'PC 앞에서 드러나는 약점과 방어기제', aliases: ['감정적 취약성', '감정 취약성', '취약성'] },
  { key: 'attach',   name: '애착 유형',       vision: '엉킨 두 고리',  hint: '안정형·불안형·회피형·혼란형',       aliases: ['애착 유형', '애착유형', '애착 양상'] },
  { key: 'confirm',  name: '확인 욕구',       vision: '답을 기다리는 말풍선', hint: '사랑받고 있음을 확인하고 싶은 정도', aliases: ['확인 욕구', '확인욕구', '애정 확인 욕구'] },
  { key: 'suppress', name: '억압된 욕구',     vision: '꿰매진 입',     hint: '원하지만 표현하지 못하는 욕망',      aliases: ['억압된 욕구', '억압 욕구', '억눌린 욕구'] },
  { key: 'worst',    name: '최악의 상상',     vision: '열린 채 빈 문',  hint: 'PC와 관련해 가장 두려워하는 상황',   aliases: ['최악의 상상', '최악 상상', '최악의 시나리오'] },
];

export const ATTACH_TYPES = ['안정형', '불안형', '회피형', '혼란형'];

/** 0~39 옅음, 40~69 보통, 70~100 진함 */
export function tierOf(pct) {
  if (pct == null) return null;
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

export const TIER_LABEL = { low: '옅음', mid: '보통', high: '진함' };
export const TIER_RANGE = { low: '0–39', mid: '40–69', high: '70–100' };
