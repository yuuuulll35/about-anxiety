// 위에서 내려다본 솥. 액체 색은 CSS 변수 --brew / --brew-l / --brew-d 를 따른다.
// 거품(cb)·김(st)·튀는 방울(sp)·국자(ladle) 클래스와 id 는 app.js 가 쓴다.
const BUBBLES = [
  [150, 128, 9, 0], [236, 150, 7, .7], [190, 168, 11, 1.4], [270, 120, 6, 2.1],
  [118, 158, 6, 2.6], [215, 112, 8, 3.2], [300, 158, 9, .4], [170, 140, 5, 1.9],
  [252, 178, 6, 2.9], [132, 118, 5, 3.6],
];

export function cauldronSVG(id, withLadle = false) {
  const bub = BUBBLES.map(([x, y, r, d], i) =>
    `<g class="cb" style="--d:${d}s;--t:${2.4 + (i % 4) * .5}s" transform="translate(${x} ${y})"><circle r="${r}"/><circle class="pop" r="${r}"/></g>`).join('');
  return `
<svg class="cauldron" viewBox="0 0 400 300" aria-hidden="true">
  <defs>
    <radialGradient id="liq${id}" cx="46%" cy="40%" r="62%">
      <stop offset="0" style="stop-color:var(--brew-l)"/>
      <stop offset=".55" style="stop-color:var(--brew)"/>
      <stop offset="1" style="stop-color:var(--brew-d)"/>
    </radialGradient>
    <linearGradient id="iron${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4166"/>
      <stop offset=".35" stop-color="#2a2340"/>
      <stop offset="1" stop-color="#110d1d"/>
    </linearGradient>
    <linearGradient id="belly${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#231c38"/>
      <stop offset="1" stop-color="#0c0915"/>
    </linearGradient>
    <clipPath id="clip${id}"><ellipse cx="200" cy="140" rx="158" ry="74"/></clipPath>
  </defs>
  <ellipse class="c-shadow" cx="200" cy="262" rx="200" ry="34"/>
  <path class="c-belly" d="M12 136 C18 250 382 250 388 136 Z" fill="url(#belly${id})"/>
  <path class="c-belly-shine" d="M44 176 C70 224 150 240 200 242"/>
  <g class="c-handle"><ellipse cx="10" cy="142" rx="12" ry="20"/><ellipse cx="390" cy="142" rx="12" ry="20"/></g>
  <ellipse class="c-rim" cx="200" cy="134" rx="190" ry="98" fill="url(#iron${id})"/>
  <path class="c-rim-shine" d="M40 108 C90 54 310 54 360 108"/>
  <ellipse class="c-inner" cx="200" cy="138" rx="168" ry="82"/>
  <g class="c-glow-wrap"><ellipse class="c-liquid" cx="200" cy="140" rx="158" ry="74" fill="url(#liq${id})"/></g>
  <g clip-path="url(#clip${id})">
    <g transform="translate(200 140) scale(1 .47)">
      <g class="c-swirl">
        <path d="M-120 0 C-120 -70 -40 -110 30 -96"/>
        <path d="M110 30 C96 90 20 120 -50 104"/>
        <path d="M-60 -30 C-30 -60 30 -60 50 -20"/>
      </g>
    </g>
    <g class="c-bubbles">${bub}</g>
    <ellipse class="c-sheen" cx="160" cy="112" rx="70" ry="16"/>
  </g>
  ${withLadle ? '<g class="ladle" id="ladle"><line id="ladleStick" x1="270" y1="140" x2="390" y2="-40"/><ellipse id="ladleHead" cx="270" cy="140" rx="16" ry="7"/></g>' : ''}
  <g class="c-steam">
    <ellipse class="st s1" cx="150" cy="110" rx="34" ry="22"/>
    <ellipse class="st s2" cx="230" cy="100" rx="42" ry="26"/>
    <ellipse class="st s3" cx="280" cy="124" rx="28" ry="18"/>
  </g>
  <g class="c-splash">
    <circle class="sp p1" cx="190" cy="136" r="7"/><circle class="sp p2" cx="214" cy="132" r="5"/>
    <circle class="sp p3" cx="202" cy="128" r="8"/><circle class="sp p4" cx="180" cy="144" r="4"/><circle class="sp p5" cx="226" cy="146" r="4"/>
  </g>
</svg>`;
}
