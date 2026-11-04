// 솥 SVG. 색은 CSS 변수 --brew / --brew-l 을 따른다(감싼 요소에서 바꿀 수 있음). withLadle 이면 국자를 그린다.
export function cauldronSVG(id, withLadle = false) {
  return `
<svg class="cauldron" viewBox="0 0 220 210" aria-hidden="true">
  <defs>
    <radialGradient id="glow${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0" style="stop-color:var(--brew-l)" stop-opacity=".75"/>
      <stop offset="1" style="stop-color:var(--brew-l)" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse class="c-glow" cx="110" cy="70" rx="110" ry="60" fill="url(#glow${id})"/>
  <g class="c-fire">
    <path class="fl f1" d="M62 206 C52 186 66 176 70 162 C78 178 90 184 82 206 Z"/>
    <path class="fl f2" d="M96 208 C82 182 100 168 110 148 C122 170 138 184 124 208 Z"/>
    <path class="fl f3" d="M138 206 C130 186 144 176 150 162 C156 178 170 188 158 206 Z"/>
    <path class="fl f4" d="M104 208 C98 192 108 184 112 172 C118 186 124 196 118 208 Z"/>
  </g>
  <path class="c-leg" d="M54 160 L44 196 L58 196 L70 166 Z M166 160 L176 196 L162 196 L150 166 Z"/>
  <path class="c-handle" d="M24 92 C4 92 4 122 24 122 M196 92 C216 92 216 122 196 122"/>
  <path class="c-body" d="M26 80 C18 150 58 182 110 182 C162 182 202 150 194 80 Z"/>
  <path class="c-shine" d="M46 100 C44 132 58 154 80 164"/>
  <ellipse class="c-liquid" cx="110" cy="80" rx="80" ry="15"/>
  <g class="c-bubbles">
    <circle class="cb b1" cx="80" cy="80" r="7"/>
    <circle class="cb b2" cx="128" cy="78" r="5"/>
    <circle class="cb b3" cx="104" cy="84" r="4"/>
    <circle class="cb b4" cx="150" cy="83" r="6"/>
    <circle class="cb b5" cx="62" cy="84" r="4"/>
  </g>
  ${withLadle ? '<g class="ladle" id="ladle"><line id="ladleStick" x1="140" y1="80" x2="182" y2="-6"/><ellipse id="ladleHead" cx="140" cy="80" rx="11" ry="5"/></g>' : ''}
  <ellipse class="c-rim" cx="110" cy="80" rx="90" ry="20"/>
  <g class="c-steam">
    <circle class="st s1" cx="84" cy="54" r="12"/>
    <circle class="st s2" cx="118" cy="48" r="16"/>
    <circle class="st s3" cx="142" cy="58" r="10"/>
  </g>
  <g class="c-splash">
    <circle class="sp p1" cx="96" cy="74" r="5"/><circle class="sp p2" cx="122" cy="72" r="4"/>
    <circle class="sp p3" cx="108" cy="70" r="6"/><circle class="sp p4" cx="88" cy="78" r="3"/><circle class="sp p5" cx="132" cy="78" r="3"/>
  </g>
</svg>`;
}
