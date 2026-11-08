// 가마솥 SVG (살짝 위에서 본 각도). 둥근 몸통 · 다리 · 손잡이 고리 · 아가리의 물약.
// 물약 색은 CSS 변수 --brew / --brew-l / --brew-d, 차오른 정도는 --lv(0~1).
// 불(.c-fire)은 몸통 앞, 솥 바닥 아래에서 타고 몸통 아랫부분을 주황빛으로 데운다(.c-warm). 불을 지핀 뒤에만 보인다.
// 움직이는 것은 불꽃·거품·김·튀는 방울·국자뿐이고 필터(blur·drop-shadow)는 쓰지 않는다(매 프레임 다시 그리는 비용).
export const RIM = { cx: 200, cy: 112, rx: 150, ry: 34 }; // 물약 표면 타원 (국자·젓기 판정에 쓴다)

const BUBBLES = [
  [150, 108, 8, 0], [232, 120, 6, .8], [186, 124, 9, 1.6], [268, 104, 6, 2.3], [122, 118, 5, 2.9], [214, 100, 7, 3.4],
];

export function cauldronSVG(id, withLadle = false) {
  const { cx, cy, rx, ry } = RIM;
  const bub = BUBBLES.map(([x, y, r, d], i) =>
    `<g class="cb" style="--d:${d}s;--t:${2.6 + (i % 3) * .5}s" transform="translate(${x} ${y})"><circle r="${r}"/></g>`).join('');
  return `
<svg class="cauldron" viewBox="0 0 400 360" aria-hidden="true">
  <defs>
    <radialGradient id="liq${id}" cx="45%" cy="40%" r="65%">
      <stop offset="0" style="stop-color:var(--brew-l)"/>
      <stop offset=".6" style="stop-color:var(--brew)"/>
      <stop offset="1" style="stop-color:var(--brew-d)"/>
    </radialGradient>
    <radialGradient id="belly${id}" cx="34%" cy="30%" r="80%">
      <stop offset="0" stop-color="#4a4068"/>
      <stop offset=".45" stop-color="#241d38"/>
      <stop offset="1" stop-color="#0b0814"/>
    </radialGradient>
    <linearGradient id="rim${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b5180"/>
      <stop offset="1" stop-color="#1a1428"/>
    </linearGradient>
    <radialGradient id="glow${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0" style="stop-color:var(--brew-l)" stop-opacity=".55"/>
      <stop offset="1" style="stop-color:var(--brew-l)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="steam${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff" stop-opacity=".5"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="clip${id}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>
    <clipPath id="bellyClip${id}"><path d="M36 116 C26 220 96 322 200 322 C304 322 374 220 364 116 Z"/></clipPath>
    <radialGradient id="warm${id}" cx="50%" cy="100%" r="70%">
      <stop offset="0" stop-color="#ffb04a" stop-opacity=".75"/>
      <stop offset=".5" stop-color="#ff6a2f" stop-opacity=".22"/>
      <stop offset="1" stop-color="#ff6a2f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="ground${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffb04a" stop-opacity=".6"/>
      <stop offset="1" stop-color="#ff6a2f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="flameO${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ff4d1f"/><stop offset=".6" stop-color="#ff7a2a"/><stop offset="1" stop-color="#ffb347" stop-opacity=".2"/>
    </linearGradient>
    <linearGradient id="flameM${id}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#ffb02e"/><stop offset="1" stop-color="#ffe066" stop-opacity=".4"/>
    </linearGradient>
  </defs>
  <ellipse class="c-shadow" cx="200" cy="338" rx="150" ry="14"/>
  <g class="c-legs"><path d="M108 290 l-14 44 h22 l10 -36 Z"/><path d="M292 290 l14 44 h-22 l-10 -36 Z"/></g>
  <g class="c-handle"><path d="M38 128 C10 132 8 176 34 186"/><path d="M362 128 C390 132 392 176 366 186"/></g>
  <path class="c-belly" d="M36 116 C26 220 96 322 200 322 C304 322 374 220 364 116 Z" fill="url(#belly${id})"/>
  <g class="c-warm" clip-path="url(#bellyClip${id})"><ellipse cx="200" cy="330" rx="150" ry="70" fill="url(#warm${id})"/></g>
  <g class="c-fire">
    <ellipse class="c-ground" cx="200" cy="346" rx="96" ry="14" fill="url(#ground${id})"/>
    <g class="c-logs"><rect x="146" y="338" width="92" height="13" rx="6.5" transform="rotate(-9 192 344)"/><rect x="162" y="338" width="92" height="13" rx="6.5" transform="rotate(9 208 344)"/><path class="c-log-end" d="M150 346 a4 4 0 1 0 0.1 0 M250 346 a4 4 0 1 0 0.1 0"/></g>
    <g class="fl f0" transform="translate(168 346) scale(0.72)"><path d="M0 0 C-15 -2 -21 -15 -14 -29 C-10 -37 -4 -42 -3 -58 C5 -48 12 -40 14 -29 C20 -15 14 -2 0 0 Z" fill="url(#flameO${id})"/><path d="M0 0 C-9 -1 -13 -9 -9 -19 C-6 -26 -2 -29 0 -40 C5 -32 9 -26 9 -19 C12 -9 8 -1 0 0 Z" fill="url(#flameM${id})"/><path class="fl-core" d="M0 0 C-5 0 -7 -5 -5 -10 C-3 -14 -1 -16 0 -22 C3 -17 5 -14 5 -10 C7 -5 5 0 0 0 Z"/></g><g class="fl f1" transform="translate(232 346) scale(0.78)"><path d="M0 0 C-15 -2 -21 -15 -14 -29 C-10 -37 -4 -42 -3 -58 C5 -48 12 -40 14 -29 C20 -15 14 -2 0 0 Z" fill="url(#flameO${id})"/><path d="M0 0 C-9 -1 -13 -9 -9 -19 C-6 -26 -2 -29 0 -40 C5 -32 9 -26 9 -19 C12 -9 8 -1 0 0 Z" fill="url(#flameM${id})"/><path class="fl-core" d="M0 0 C-5 0 -7 -5 -5 -10 C-3 -14 -1 -16 0 -22 C3 -17 5 -14 5 -10 C7 -5 5 0 0 0 Z"/></g><g class="fl f2" transform="translate(186 346) scale(1.05)"><path d="M0 0 C-15 -2 -21 -15 -14 -29 C-10 -37 -4 -42 -3 -58 C5 -48 12 -40 14 -29 C20 -15 14 -2 0 0 Z" fill="url(#flameO${id})"/><path d="M0 0 C-9 -1 -13 -9 -9 -19 C-6 -26 -2 -29 0 -40 C5 -32 9 -26 9 -19 C12 -9 8 -1 0 0 Z" fill="url(#flameM${id})"/><path class="fl-core" d="M0 0 C-5 0 -7 -5 -5 -10 C-3 -14 -1 -16 0 -22 C3 -17 5 -14 5 -10 C7 -5 5 0 0 0 Z"/></g><g class="fl f3" transform="translate(216 346) scale(0.98)"><path d="M0 0 C-15 -2 -21 -15 -14 -29 C-10 -37 -4 -42 -3 -58 C5 -48 12 -40 14 -29 C20 -15 14 -2 0 0 Z" fill="url(#flameO${id})"/><path d="M0 0 C-9 -1 -13 -9 -9 -19 C-6 -26 -2 -29 0 -40 C5 -32 9 -26 9 -19 C12 -9 8 -1 0 0 Z" fill="url(#flameM${id})"/><path class="fl-core" d="M0 0 C-5 0 -7 -5 -5 -10 C-3 -14 -1 -16 0 -22 C3 -17 5 -14 5 -10 C7 -5 5 0 0 0 Z"/></g><g class="fl f4" transform="translate(200 346) scale(1.25)"><path d="M0 0 C-15 -2 -21 -15 -14 -29 C-10 -37 -4 -42 -3 -58 C5 -48 12 -40 14 -29 C20 -15 14 -2 0 0 Z" fill="url(#flameO${id})"/><path d="M0 0 C-9 -1 -13 -9 -9 -19 C-6 -26 -2 -29 0 -40 C5 -32 9 -26 9 -19 C12 -9 8 -1 0 0 Z" fill="url(#flameM${id})"/><path class="fl-core" d="M0 0 C-5 0 -7 -5 -5 -10 C-3 -14 -1 -16 0 -22 C3 -17 5 -14 5 -10 C7 -5 5 0 0 0 Z"/></g>
    <g class="c-embers"><circle cx="182" cy="320" r="2"/><circle cx="214" cy="314" r="1.6"/><circle cx="200" cy="300" r="1.8"/><circle cx="226" cy="326" r="1.4"/></g>
  </g>
  <path class="c-belly-shine" d="M70 160 C70 222 110 270 160 290"/>
  <ellipse class="c-glow" cx="${cx}" cy="${cy - 6}" rx="${rx + 40}" ry="${ry + 34}" fill="url(#glow${id})"/>
  <ellipse class="c-rim" cx="${cx}" cy="${cy}" rx="${rx + 18}" ry="${ry + 12}" fill="url(#rim${id})"/>
  <ellipse class="c-inner" cx="${cx}" cy="${cy + 2}" rx="${rx + 4}" ry="${ry + 3}"/>
  <ellipse class="c-liquid" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#liq${id})"/>
  <g clip-path="url(#clip${id})">
    <path class="c-swirl" d="M90 ${cy} C110 ${cy - 26} 190 ${cy - 30} 230 ${cy - 12} M300 ${cy + 4} C280 ${cy + 26} 200 ${cy + 30} 160 ${cy + 14}"/>
    <g class="c-bubbles">${bub}</g>
    <ellipse class="c-sheen" cx="160" cy="${cy - 14}" rx="64" ry="9"/>
  </g>
  <path class="c-rim-shine" d="M60 ${cy - 22} C110 ${cy - 48} 290 ${cy - 48} 340 ${cy - 22}"/>
  ${withLadle ? `<g class="ladle" id="ladle"><line id="ladleStick" x1="${cx}" y1="${cy}" x2="390" y2="-40"/><ellipse id="ladleHead" cx="${cx}" cy="${cy}" rx="16" ry="6"/></g>` : ''}
  <g class="c-steam">
    <ellipse class="st s1" cx="160" cy="${cy - 30}" rx="40" ry="26" fill="url(#steam${id})"/>
    <ellipse class="st s2" cx="240" cy="${cy - 40}" rx="48" ry="30" fill="url(#steam${id})"/>
  </g>
  <g class="c-splash">
    <circle class="sp p1" cx="190" cy="${cy}" r="7"/><circle class="sp p2" cx="214" cy="${cy - 4}" r="5"/>
    <circle class="sp p3" cx="202" cy="${cy - 8}" r="8"/><circle class="sp p4" cx="180" cy="${cy + 6}" r="4"/><circle class="sp p5" cx="226" cy="${cy + 6}" r="4"/>
  </g>
</svg>`;
}
