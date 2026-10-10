'use strict';
// Genera las ilustraciones SVG usadas por los datos de demostración (public/demo).
// Son imágenes de ejemplo: reemplázalas por fotografías reales desde el panel.
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'public', 'demo');
fs.mkdirSync(OUT, { recursive: true });

const defs = (id, accent = '#22d3ee', primary = '#1e7bff') => `
<defs>
  <radialGradient id="bg${id}" cx="50%" cy="42%" r="75%">
    <stop offset="0" stop-color="#12233d"/><stop offset=".55" stop-color="#0a1322"/><stop offset="1" stop-color="#04070d"/>
  </radialGradient>
  <radialGradient id="glow${id}" cx="50%" cy="50%" r="50%">
    <stop offset="0" stop-color="${accent}" stop-opacity=".45"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="body${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f4f7fb"/><stop offset="1" stop-color="#b9c3d1"/>
  </linearGradient>
  <linearGradient id="dark${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#2a3446"/><stop offset="1" stop-color="#0d121b"/>
  </linearGradient>
  <linearGradient id="acc${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${primary}"/><stop offset="1" stop-color="${accent}"/>
  </linearGradient>
  <pattern id="grid${id}" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40 0H0V40" fill="none" stroke="#1e7bff" stroke-opacity=".08" stroke-width="1"/>
  </pattern>
  <filter id="soft${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
</defs>`;

const lens = (cx, cy, r, id) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#05080d" stroke="#3a4558" stroke-width="${r * 0.12}"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="url(#acc${id})" opacity=".55"/>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="#020409"/>
  <circle cx="${cx - r * 0.25}" cy="${cy - r * 0.28}" r="${r * 0.14}" fill="#fff" opacity=".7"/>`;

// Dibujo de cada tipo de dispositivo centrado en (0,0) en un lienzo de ~400px.
const DEVICES = {
  dome: (id) => `
    <ellipse cx="0" cy="150" rx="120" ry="18" fill="#000" opacity=".45"/>
    <path d="M-95 120 Q-100 40 -70 10 L70 10 Q100 40 95 120 Z" fill="url(#body${id})"/>
    <circle cx="0" cy="-40" r="110" fill="url(#body${id})"/>
    <circle cx="0" cy="-40" r="78" fill="url(#dark${id})"/>
    ${lens(0, -40, 42, id)}
    <circle cx="48" cy="-90" r="5" fill="#22d3ee"/>`,
  bullet: (id) => `
    <ellipse cx="0" cy="160" rx="140" ry="16" fill="#000" opacity=".45"/>
    <rect x="-30" y="40" width="60" height="110" rx="12" fill="url(#body${id})"/>
    <rect x="-80" y="140" width="160" height="22" rx="8" fill="url(#body${id})"/>
    <path d="M-150 -70 h230 a40 40 0 0 1 40 40 v60 a40 40 0 0 1 -40 40 h-230 z" fill="url(#body${id})"/>
    <path d="M-170 -88 h250 a20 20 0 0 1 20 20 v10 h-270 z" fill="#d7dee8"/>
    <rect x="70" y="-62" width="44" height="114" rx="20" fill="url(#dark${id})"/>
    ${lens(92, -5, 28, id)}
    <circle cx="-110" cy="-20" r="5" fill="#22d3ee"/>
    <path d="M-60 -150 v40 M-20 -150 v40" stroke="#c9d2de" stroke-width="10" stroke-linecap="round"/>`,
  ptz: (id) => `
    <ellipse cx="0" cy="165" rx="120" ry="16" fill="#000" opacity=".45"/>
    <rect x="-90" y="-150" width="180" height="60" rx="18" fill="url(#body${id})"/>
    <rect x="-20" y="-95" width="40" height="40" fill="#c8d1dd"/>
    <circle cx="0" cy="40" r="115" fill="url(#body${id})"/>
    <rect x="-80" y="-10" width="160" height="90" rx="40" fill="url(#dark${id})"/>
    ${lens(-28, 35, 30, id)}
    ${lens(38, 35, 18, id)}
    <path d="M-60 -165 l-40 -40 M60 -165 l40 -40" stroke="#c9d2de" stroke-width="8" stroke-linecap="round"/>`,
  speaker: (id) => `
    <ellipse cx="0" cy="150" rx="150" ry="20" fill="#000" opacity=".5"/>
    <path d="M-150 40 Q-150 -130 0 -130 Q150 -130 150 40 Q150 140 0 140 Q-150 140 -150 40 Z" fill="url(#dark${id})"/>
    <path d="M-150 40 Q-150 -130 0 -130 Q150 -130 150 40" fill="none" stroke="#3b4a60" stroke-width="3"/>
    <ellipse cx="0" cy="110" rx="110" ry="14" fill="none" stroke="url(#acc${id})" stroke-width="8"/>
    <ellipse cx="0" cy="110" rx="110" ry="14" fill="none" stroke="#22d3ee" stroke-width="16" opacity=".35" filter="url(#soft${id})"/>
    <circle cx="-40" cy="-60" r="6" fill="#5b6a80"/><circle cx="40" cy="-60" r="6" fill="#5b6a80"/>`,
  display: (id) => `
    <ellipse cx="0" cy="150" rx="170" ry="18" fill="#000" opacity=".5"/>
    <path d="M-150 140 L-120 -20 L160 -20 L130 140 Z" fill="url(#dark${id})"/>
    <rect x="-170" y="-130" width="320" height="200" rx="16" fill="#0b1018" stroke="#3b4a60" stroke-width="6"/>
    <rect x="-155" y="-115" width="290" height="170" rx="8" fill="url(#acc${id})" opacity=".85"/>
    <text x="-130" y="-40" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#fff">10:30</text>
    <text x="-130" y="0" font-family="Arial, sans-serif" font-size="22" fill="#e8f6ff">Luces · Cámaras · Clima</text>
    <circle cx="90" cy="-60" r="24" fill="#fff" opacity=".85"/>`,
  switch: (id) => `
    <rect x="-140" y="-160" width="280" height="300" rx="28" fill="url(#body${id})"/>
    <rect x="-120" y="-140" width="240" height="260" rx="18" fill="#e8edf3" stroke="#c6cfdb" stroke-width="3"/>
    <rect x="-110" y="-130" width="105" height="240" rx="12" fill="#f7f9fc" stroke="#cfd7e2" stroke-width="2"/>
    <rect x="5" y="-130" width="105" height="240" rx="12" fill="#f7f9fc" stroke="#cfd7e2" stroke-width="2"/>
    <rect x="-75" y="-20" width="34" height="5" rx="2.5" fill="#22d3ee"/>
    <rect x="40" y="-20" width="34" height="5" rx="2.5" fill="#1e7bff"/>
    <rect x="-75" y="-20" width="34" height="5" rx="2.5" fill="#22d3ee" filter="url(#soft${id})"/>`,
  plug: (id) => `
    <ellipse cx="0" cy="150" rx="110" ry="14" fill="#000" opacity=".45"/>
    <rect x="-110" y="-140" width="220" height="280" rx="50" fill="url(#body${id})"/>
    <circle cx="0" cy="-10" r="62" fill="#e9eef4" stroke="#c6cfdb" stroke-width="3"/>
    <circle cx="-24" cy="-10" r="9" fill="#3a4558"/><circle cx="24" cy="-10" r="9" fill="#3a4558"/>
    <rect x="-24" y="95" width="48" height="16" rx="8" fill="#d2dae5"/>
    <circle cx="0" cy="103" r="5" fill="#22d3ee"/>
    <circle cx="0" cy="103" r="12" fill="#22d3ee" opacity=".5" filter="url(#soft${id})"/>`,
  bulb: (id) => `
    <circle cx="0" cy="-40" r="170" fill="url(#glow${id})"/>
    <path d="M-110 -50 a110 110 0 1 1 220 0 c0 50 -40 80 -50 120 h-120 c-10 -40 -50 -70 -50 -120 z" fill="#fff8e1" opacity=".95"/>
    <path d="M-110 -50 a110 110 0 1 1 220 0 c0 50 -40 80 -50 120 h-120 c-10 -40 -50 -70 -50 -120 z" fill="url(#acc${id})" opacity=".25"/>
    <rect x="-60" y="70" width="120" height="25" rx="6" fill="#c9d2de"/>
    <rect x="-55" y="97" width="110" height="18" rx="6" fill="#aab5c4"/>
    <rect x="-50" y="117" width="100" height="18" rx="6" fill="#c9d2de"/>
    <path d="M-25 137 h50 l-12 22 h-26 z" fill="#5b6a80"/>`,
  strip: (id) => `
    <path d="M-170 100 C -80 -60 60 160 170 -60" stroke="url(#acc${id})" stroke-width="34" fill="none" stroke-linecap="round" opacity=".45" filter="url(#soft${id})"/>
    <path d="M-170 100 C -80 -60 60 160 170 -60" stroke="#e8eef6" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M-170 100 C -80 -60 60 160 170 -60" stroke="url(#acc${id})" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="2 16"/>
    <rect x="-200" y="90" width="60" height="40" rx="10" fill="url(#dark${id})"/>`,
  sensor: (id) => `
    <ellipse cx="0" cy="150" rx="110" ry="14" fill="#000" opacity=".4"/>
    <rect x="-90" y="-150" width="180" height="280" rx="32" fill="url(#body${id})"/>
    <circle cx="0" cy="-40" r="58" fill="#dfe6ee" stroke="#c4cdd9" stroke-width="3"/>
    <circle cx="0" cy="-40" r="34" fill="#f8fafc" opacity=".9"/>
    <path d="M-30 -40 a30 30 0 0 1 60 0" fill="none" stroke="#c4cdd9" stroke-width="3"/>
    <circle cx="0" cy="70" r="6" fill="#22d3ee"/>
    <path d="M120 -90 a80 80 0 0 1 0 110 M145 -115 a115 115 0 0 1 0 160" stroke="#22d3ee" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>`,
  router: (id) => `
    <ellipse cx="0" cy="150" rx="150" ry="16" fill="#000" opacity=".45"/>
    <rect x="-75" y="-140" width="150" height="280" rx="60" fill="url(#body${id})"/>
    <rect x="-55" y="-120" width="110" height="18" rx="9" fill="#d5dde7"/>
    <circle cx="0" cy="110" r="6" fill="#22d3ee"/>
    <path d="M-150 -40 a160 160 0 0 1 0 140 M150 -40 a160 160 0 0 0 0 140" stroke="#1e7bff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".75"/>
    <path d="M-120 -15 a110 110 0 0 1 0 90 M120 -15 a110 110 0 0 0 0 90" stroke="#22d3ee" stroke-width="7" fill="none" stroke-linecap="round" opacity=".9"/>`,
  hub: (id) => `
    <ellipse cx="0" cy="120" rx="150" ry="18" fill="#000" opacity=".45"/>
    <rect x="-140" y="-50" width="280" height="160" rx="70" fill="url(#body${id})"/>
    <ellipse cx="0" cy="-50" rx="140" ry="22" fill="#eef2f7"/>
    <circle cx="0" cy="30" r="10" fill="#22d3ee"/>
    <circle cx="0" cy="30" r="22" fill="#22d3ee" opacity=".4" filter="url(#soft${id})"/>
    <g stroke="#22d3ee" stroke-width="5" fill="none" opacity=".85" stroke-linecap="round">
      <path d="M-60 -110 a85 85 0 0 1 120 0"/><path d="M-95 -145 a135 135 0 0 1 190 0"/>
    </g>`,
  doorbell: (id) => `
    <ellipse cx="0" cy="170" rx="80" ry="12" fill="#000" opacity=".4"/>
    <rect x="-70" y="-170" width="140" height="330" rx="40" fill="url(#dark${id})"/>
    ${lens(0, -95, 34, id)}
    <circle cx="0" cy="80" r="40" fill="#1a2433" stroke="url(#acc${id})" stroke-width="7"/>
    <circle cx="0" cy="80" r="44" fill="none" stroke="#22d3ee" stroke-width="10" opacity=".35" filter="url(#soft${id})"/>`,
  kit: (id) => `
    <g transform="translate(-95 -10) scale(.55)">${DEVICES.dome(id + 'a')}</g>
    <g transform="translate(95 25) scale(.5)">${DEVICES.sensor(id + 'b')}</g>
    <g transform="translate(0 85) scale(.38)">${DEVICES.hub(id + 'c')}</g>`,
};

function svgImage({ w, h, device, id, label = 'IMAGEN DE EJEMPLO', accent, scale = 1 }) {
  const cx = w / 2;
  const cy = h / 2 + 10;
  const inner = DEVICES[device](id);
  const allDefs = [id, id + 'a', id + 'b', id + 'c'].map((i) => defs(i, accent)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
${allDefs}
<rect width="${w}" height="${h}" fill="url(#bg${id})"/>
<rect width="${w}" height="${h}" fill="url(#grid${id})"/>
<circle cx="${cx}" cy="${cy - 20}" r="${Math.min(w, h) * 0.38}" fill="url(#glow${id})"/>
<g transform="translate(${cx} ${cy}) scale(${scale})">${inner}</g>
<text x="${w - 18}" y="${h - 18}" text-anchor="end" font-family="Arial, sans-serif" font-size="15" letter-spacing="2" fill="#8fb3d9" opacity=".75">${label}</text>
</svg>`;
}

// Ilustración principal: casa inteligente con conexiones luminosas.
function hero() {
  const id = 'h';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
${defs(id)}${defs(id + 'x')}
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a14"/><stop offset="1" stop-color="#0b1730"/></linearGradient>
<linearGradient id="house" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16243d"/><stop offset="1" stop-color="#0b1424"/></linearGradient>
<linearGradient id="win" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fe7ff"/><stop offset="1" stop-color="#1e7bff"/></linearGradient>
<rect width="1600" height="900" fill="url(#sky)"/>
<rect width="1600" height="900" fill="url(#grid${id})"/>
<circle cx="1100" cy="420" r="420" fill="url(#glow${id})"/>
<g opacity=".9">
  <path d="M760 520 L1100 250 L1440 520" fill="none" stroke="url(#acc${id})" stroke-width="10" stroke-linejoin="round"/>
  <path d="M800 500 V780 H1400 V500 L1100 270 Z" fill="url(#house)" stroke="#1e7bff" stroke-opacity=".6" stroke-width="3"/>
  <rect x="860" y="560" width="150" height="110" rx="8" fill="url(#win)" opacity=".85"/>
  <rect x="1190" y="560" width="150" height="110" rx="8" fill="url(#win)" opacity=".55"/>
  <rect x="1050" y="620" width="100" height="160" rx="8" fill="#0a1220" stroke="#22d3ee" stroke-opacity=".7" stroke-width="3"/>
  <circle cx="1130" cy="700" r="5" fill="#22d3ee"/>
  <rect x="1060" y="420" width="80" height="80" rx="40" fill="url(#win)" opacity=".7"/>
</g>
<g stroke="#22d3ee" stroke-width="2" fill="none" stroke-dasharray="6 10" opacity=".7">
  <path d="M1100 250 C 1000 120 820 140 720 200"/>
  <path d="M1440 520 C 1520 420 1520 300 1460 220"/>
  <path d="M800 780 C 700 820 620 760 600 680"/>
  <path d="M1400 700 C 1480 720 1530 780 1540 840"/>
</g>
<g fill="#0d1726" stroke="url(#acc${id})" stroke-width="3">
  <circle cx="720" cy="200" r="44"/><circle cx="1460" cy="220" r="44"/><circle cx="600" cy="680" r="44"/><circle cx="1540" cy="840" r="36"/>
</g>
<g fill="none" stroke="#e6f7ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(696 176) scale(2)"><circle cx="12" cy="11" r="6"/><circle cx="12" cy="11" r="2.5"/><path d="M8 21h8M12 17v4"/></g>
  <g transform="translate(1436 196) scale(2)"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10.5 10.5 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0"/><path d="M12 19h.01"/></g>
  <g transform="translate(576 656) scale(2)"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/></g>
  <g transform="translate(1522 822) scale(1.5)"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/></g>
</g>
<g transform="translate(1290 470) scale(.32)">${DEVICES.bullet(id + 'x')}</g>
<rect y="780" width="1600" height="120" fill="#04070d" opacity=".75"/>
<text x="1580" y="880" text-anchor="end" font-family="Arial, sans-serif" font-size="16" letter-spacing="2" fill="#8fb3d9" opacity=".6">IMAGEN DE EJEMPLO</text>
</svg>`;
}

const files = {
  'hero.svg': hero(),
  // Categorías (800x600)
  'cat-domotica.svg': svgImage({ w: 800, h: 600, device: 'hub', id: 'c1', scale: 0.95 }),
  'cat-camaras-interior.svg': svgImage({ w: 800, h: 600, device: 'dome', id: 'c2', scale: 0.9 }),
  'cat-camaras-exterior.svg': svgImage({ w: 800, h: 600, device: 'bullet', id: 'c3', scale: 0.9 }),
  'cat-asistentes.svg': svgImage({ w: 800, h: 600, device: 'speaker', id: 'c4', scale: 0.95 }),
  'cat-interruptores.svg': svgImage({ w: 800, h: 600, device: 'switch', id: 'c5', scale: 0.8 }),
  'cat-iluminacion.svg': svgImage({ w: 800, h: 600, device: 'bulb', id: 'c6', scale: 0.85, accent: '#7dd3fc' }),
  'cat-sensores.svg': svgImage({ w: 800, h: 600, device: 'sensor', id: 'c7', scale: 0.85 }),
  'cat-accesorios.svg': svgImage({ w: 800, h: 600, device: 'router', id: 'c8', scale: 0.85 }),
  // Productos (800x800)
  'p-camara-360.svg': svgImage({ w: 800, h: 800, device: 'dome', id: 'p1', scale: 1.25 }),
  'p-camara-360-b.svg': svgImage({ w: 800, h: 800, device: 'dome', id: 'p1b', scale: 0.9, accent: '#1e7bff' }),
  'p-camara-bala.svg': svgImage({ w: 800, h: 800, device: 'bullet', id: 'p2', scale: 1.2 }),
  'p-camara-ptz.svg': svgImage({ w: 800, h: 800, device: 'ptz', id: 'p3', scale: 1.15 }),
  'p-timbre.svg': svgImage({ w: 800, h: 800, device: 'doorbell', id: 'p4', scale: 1.15 }),
  'p-parlante.svg': svgImage({ w: 800, h: 800, device: 'speaker', id: 'p5', scale: 1.25 }),
  'p-pantalla.svg': svgImage({ w: 800, h: 800, device: 'display', id: 'p6', scale: 1.15 }),
  'p-interruptor.svg': svgImage({ w: 800, h: 800, device: 'switch', id: 'p7', scale: 1.1 }),
  'p-enchufe.svg': svgImage({ w: 800, h: 800, device: 'plug', id: 'p8', scale: 1.2 }),
  'p-bombillo.svg': svgImage({ w: 800, h: 800, device: 'bulb', id: 'p9', scale: 1.2, accent: '#7dd3fc' }),
  'p-tira-led.svg': svgImage({ w: 800, h: 800, device: 'strip', id: 'p10', scale: 1.4, accent: '#a78bfa' }),
  'p-sensor.svg': svgImage({ w: 800, h: 800, device: 'sensor', id: 'p11', scale: 1.2 }),
  'p-router-mesh.svg': svgImage({ w: 800, h: 800, device: 'router', id: 'p12', scale: 1.2 }),
  'p-hub.svg': svgImage({ w: 800, h: 800, device: 'hub', id: 'p13', scale: 1.25 }),
  'p-kit.svg': svgImage({ w: 800, h: 800, device: 'kit', id: 'p14', scale: 1.35 }),
  // Promociones (1200x500)
  'promo-kit.svg': svgImage({ w: 1200, h: 500, device: 'kit', id: 'pr1', scale: 0.85, label: 'PROMOCIÓN DE EJEMPLO' }),
  'promo-luces.svg': svgImage({ w: 1200, h: 500, device: 'strip', id: 'pr2', scale: 0.9, accent: '#a78bfa', label: 'PROMOCIÓN DE EJEMPLO' }),
};

for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), content);

// Logotipo por defecto (vectorial, editable reemplazándolo desde el panel).
fs.writeFileSync(
  path.join(OUT, '..', 'logo.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e7bff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="#0a1220"/><path d="M14 31 32 16l18 15" fill="none" stroke="url(#g)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 29v18h26V29" fill="none" stroke="url(#g)" stroke-width="4.5" stroke-linejoin="round"/><path d="M26 40a8.5 8.5 0 0 1 12 0M29 44a4 4 0 0 1 6 0" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/></svg>`
);
console.log(`Generadas ${Object.keys(files).length} imágenes de ejemplo en ${OUT}`);
