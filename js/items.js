// OOC 항목 정의 — 사랑의 묘약(호감 해부).
// name 은 화면 표기, aliases 는 파서가 줄 머리에서 찾는 이름(공백 무시).
// ANXIETY: 솥에 넣는 재료 = NPC가 PC에게 끌리는 이유 12종 (코드 A01~A12. 이름은 예전 구조를 따라 그대로 둔다)
// HIDDEN: 연기 속 환영 = 숨겨진 마음 6종 (H01~H06). key 'attach' 칸은 하나 고르기(사랑의 언어)다.
// q 의 {P가} {P를} {P에게} {P의} {P와} 는 PC 이름 + 조사로 바뀐다.

export const ANXIETY = [
  { key: 'looks',    short: '외모',       q: '{P의} 얼굴과 모습에 자꾸 눈이 가는 마음',    name: '외모 끌림',     ing: '자꾸 비춰 보는 거울 조각', color: '#ff7fbf', hint: 'PC의 얼굴·체격·분위기에 끌리는 정도',        aliases: ['외모 끌림', '외모끌림', '외모에 끌림'] },
  { key: 'voice',    short: '목소리',     q: '{P의} 목소리가 귓가에 맴도는 마음',          name: '목소리 끌림',   ing: '귓가에 남은 메아리',       color: '#a98bff', hint: 'PC의 목소리·말투에 끌리는 정도',              aliases: ['목소리 끌림', '목소리끌림', '목소리에 끌림'] },
  { key: 'touch',    short: '손길',       q: '{P의} 손길과 온기가 그리운 마음',            name: '손길 끌림',     ing: '손끝에 남은 온기',         color: '#f08a5d', hint: 'PC와의 접촉·체온에 끌리는 정도',              aliases: ['손길 끌림', '손길끌림', '온기 끌림'] },
  { key: 'scent',    short: '향기',       q: '{P에게서} 나는 향기를 기억하는 마음',        name: '향기 끌림',     ing: '옷깃에 밴 향수',           color: '#e9e2ff', hint: 'PC의 체취·향기에 끌리는 정도',                aliases: ['향기 끌림', '향기끌림', '체취 끌림'] },
  { key: 'kind',     short: '다정함',     q: '{P의} 다정함에 마음이 녹는 마음',            name: '다정함 끌림',   ing: '식지 않는 찻잔',           color: '#f2c84b', hint: 'PC의 배려·친절에 끌리는 정도',                aliases: ['다정함 끌림', '다정함끌림', '다정 끌림'] },
  { key: 'surprise', short: '의외성',     q: '{P의} 뜻밖의 모습에 놀라 끌리는 마음',       name: '의외성 끌림',   ing: '뒤집힌 타로 카드',         color: '#5fd3c4', hint: '예상과 다른 PC의 모습에 끌리는 정도',         aliases: ['의외성 끌림', '의외성끌림', '반전 끌림'] },
  { key: 'skill',    short: '능력',       q: '{P가} 무언가를 해내는 모습에 반하는 마음',   name: '능력 끌림',     ing: '반짝이는 별가루',          color: '#d9843f', hint: 'PC의 실력·유능함에 끌리는 정도',              aliases: ['능력 끌림', '능력끌림', '유능함 끌림'] },
  { key: 'fragile',  short: '약한 모습',  q: '{P의} 약한 모습을 지켜 주고 싶은 마음',      name: '약한 모습 끌림', ing: '금 간 유리구슬',          color: '#7fa7c9', hint: 'PC의 상처·약점에 끌리는 정도',                aliases: ['약한 모습 끌림', '약한모습 끌림', '약한 모습'] },
  { key: 'talk',     short: '대화',       q: '{P와} 말이 잘 통해 즐거운 마음',             name: '대화 끌림',     ing: '끝나지 않는 실타래',       color: '#6fcf4a', hint: 'PC와 말·생각이 통하는 데서 오는 끌림',        aliases: ['대화 끌림', '대화끌림', '대화가 통함'] },
  { key: 'ease',     short: '편안함',     q: '{P} 곁에 있으면 편해지는 마음',              name: '편안함 끌림',   ing: '햇볕에 마른 담요',         color: '#3f5fe0', hint: 'PC 곁에서 느끼는 안정감에 끌리는 정도',       aliases: ['편안함 끌림', '편안함끌림', '편안 끌림'] },
  { key: 'treat',    short: '대하는 방식', q: '{P가} 자기를 대하는 방식이 좋은 마음',      name: '대하는 방식 끌림', ing: '나만 받은 쪽지',        color: '#8a6aa8', hint: 'PC가 NPC를 대하는 태도에 끌리는 정도',        aliases: ['대하는 방식 끌림', '대하는방식 끌림', '대하는 방식'] },
  { key: 'danger',   short: '위험한 매력', q: '{P의} 위험한 분위기에 끌리는 마음',         name: '위험한 매력 끌림', ing: '가시 돋친 장미',        color: '#e0413b', hint: 'PC의 아슬아슬한 매력에 끌리는 정도',          aliases: ['위험한 매력 끌림', '위험한매력 끌림', '위험한 매력'] },
];

export const HIDDEN = [
  { key: 'first',     name: '첫 흔들림',        vision: '멈춘 회중시계',     hint: '처음 마음이 기운 순간이 지금도 남아 있는 정도', aliases: ['첫 흔들림', '첫흔들림', '처음 흔들린 순간'] },
  { key: 'daydream',  name: '몰래 하는 상상',   vision: '김 서린 창문의 낙서', hint: 'PC와의 일을 혼자 상상하는 정도',             aliases: ['몰래 하는 상상', '몰래하는 상상', '몰래 상상'] },
  { key: 'attach',    name: '사랑의 언어',      vision: '포개진 두 손',      hint: '다정한 말·함께하는 시간·선물·챙겨 주기·스킨십', aliases: ['사랑의 언어', '사랑의언어', '애정 표현 방식'] },
  { key: 'jealous',   name: '질투',             vision: '초록 불꽃',         hint: 'PC 곁의 다른 사람에게 느끼는 질투의 정도',    aliases: ['질투', '질투심'] },
  { key: 'unsaid',    name: '삼킨 고백',        vision: '봉해진 편지',       hint: '하고 싶지만 참고 있는 말이 차오른 정도',      aliases: ['삼킨 고백', '삼킨고백', '참고 있는 말'] },
  { key: 'habit',     name: '들키기 싫은 습관', vision: '책갈피 속 꽃잎',    hint: 'PC 때문에 생긴, 몰래 하는 습관의 정도',       aliases: ['들키기 싫은 습관', '들키기싫은 습관', '몰래 하는 습관'] },
];

/** 하나 고르기 칸(사랑의 언어). 변수 이름은 예전 구조를 따라 그대로 둔다. */
export const ATTACH_TYPES = ['다정한 말', '함께하는 시간', '선물', '챙겨 주기', '스킨십'];

/** 0~39 옅음, 40~69 보통, 70~100 진함 */
export function tierOf(pct) {
  if (pct == null) return null;
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'mid';
  return 'low';
}

export const TIER_LABEL = { low: '옅음', mid: '보통', high: '진함' };
export const TIER_RANGE = { low: '0–39', mid: '40–69', high: '70–100' };
