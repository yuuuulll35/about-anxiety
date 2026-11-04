// 엑스레이 필름 그림 (viewBox 0 0 100 100, 선만)
const HEART = 'M50 82 C20 60 14 44 22 32 C30 20 44 22 50 34 C56 22 70 20 78 32 C86 44 80 60 50 82 Z';

export const FILM_ICONS = {
  possess: `<circle cx="50" cy="52" r="38" stroke-dasharray="6 6"/><path d="${HEART}" transform="translate(23 26) scale(.54)"/><path d="M12 52h8M80 52h8M50 10v8M50 86v8"/>`,
  vulner: `<path d="${HEART}"/><path d="M50 34 L43 48 L55 56 L45 70"/>`,
  attach: `<circle cx="38" cy="50" r="22"/><circle cx="62" cy="50" r="22"/>`,
  confirm: `<path d="M16 24 H84 V64 H46 L30 80 V64 H16 Z"/><path d="M36 44 L46 54 L64 36"/>`,
  suppress: `<path d="M18 50 C32 32 68 32 82 50 C68 68 32 68 18 50 Z"/><path d="M22 50 H78"/><path d="M30 46v8M38 46v8M46 46v8M54 46v8M62 46v8M70 46v8"/>`,
  worst: `<path d="M30 14 H70 V88 H30 Z"/><path d="M30 14 L56 22 V92 L30 88"/><circle cx="50" cy="56" r="2.5"/><path d="M70 30 L86 22M70 50 L90 50M70 70 L86 78"/>`,
};
