// 엑스레이 필름 그림 (viewBox 0 0 100 100, 선만). 키는 items.js 의 HIDDEN 과 같다.
const HEART = 'M50 82 C20 60 14 44 22 32 C30 20 44 22 50 34 C56 22 70 20 78 32 C86 44 80 60 50 82 Z';

export const FILM_ICONS = {
  // 멈춘 회중시계
  first: `<circle cx="50" cy="56" r="30"/><path d="M50 26 V16 M42 14 H58"/><path d="M50 56 L50 38 M50 56 L62 64"/><path d="M50 30v4M76 56h-4M50 82v-4M24 56h4"/>`,
  // 김 서린 창문의 낙서
  daydream: `<path d="M18 14 H82 V86 H18 Z"/><path d="M50 14 V86 M18 50 H82"/><path d="${HEART}" transform="translate(26 22) scale(.24)"/><path d="M60 64 q6 -8 12 0 t12 0" transform="translate(-6 0)"/>`,
  // 포개진 두 손
  attach: `<path d="M20 62 C20 44 34 34 50 36 C66 34 80 44 80 62 C80 74 66 82 50 80 C34 82 20 74 20 62 Z"/><path d="M30 52 C40 46 60 46 70 52"/><path d="M34 62 C44 56 56 56 66 62"/><path d="M38 36 V24 M50 36 V20 M62 36 V24"/>`,
  // 초록 불꽃
  jealous: `<path d="M50 88 C28 86 22 66 32 50 C36 60 42 60 42 52 C42 38 52 28 50 12 C66 26 80 46 74 66 C70 80 62 88 50 88 Z"/><path d="M50 84 C42 82 40 72 46 64 C48 70 54 70 54 62 C62 70 60 82 50 84 Z"/>`,
  // 봉해진 편지
  unsaid: `<path d="M14 26 H86 V78 H14 Z"/><path d="M14 26 L50 56 L86 26"/><circle cx="50" cy="60" r="9"/><path d="M46 60 h8 M50 56 v8"/>`,
  // 책갈피 속 꽃잎
  habit: `<path d="M22 16 H78 V88 H22 Z"/><path d="M50 16 V88"/><path d="M60 16 V40 L66 34 L72 40 V16"/><path d="M34 60 C30 50 38 44 40 52 C42 44 50 50 46 60 C44 66 36 66 34 60 Z"/>`,
};
