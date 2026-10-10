'use strict';
const db = require('./db');

// Valores por defecto. Todo es editable desde el panel administrativo.
// Los campos de contacto quedan vacíos a propósito: no se inventan datos comerciales.
const DEFAULTS = {
  store_name: 'SmartHome_Vpar',
  tagline: 'Tecnología inteligente para una vida más segura y conectada.',
  logo: '',
  favicon: '',

  color_bg: '#05080f',
  color_surface: '#0d1522',
  color_primary: '#1e7bff',
  color_accent: '#22d3ee',
  color_text: '#e6edf7',
  font_body: 'Inter',
  font_heading: 'Sora',

  hero_title: 'SmartHome_Vpar',
  hero_subtitle: 'Tecnología inteligente para una vida más segura y conectada.',
  hero_text:
    'Descubre soluciones de seguridad, automatización y conectividad para transformar tu hogar o negocio.',
  hero_image: '/demo/hero.svg',
  hero_btn_primary: 'Explorar productos',
  hero_btn_whatsapp: 'Comprar por WhatsApp',

  categories_title: 'Explora por categoría',
  categories_text: 'Encuentra la solución ideal para tu hogar o negocio.',
  featured_title: 'Productos destacados',
  featured_text: 'Una selección de nuestros productos más consultados.',
  promos_title: 'Promociones',
  promos_text: 'Ofertas, paquetes y productos recomendados.',
  benefits_title: '¿Por qué SmartHome_Vpar?',
  benefits: JSON.stringify([
    { icon: 'home', title: 'Tecnología para hogares inteligentes', text: 'Dispositivos para automatizar luces, enchufes y rutinas diarias.' },
    { icon: 'shield', title: 'Soluciones de seguridad y monitoreo', text: 'Cámaras y sensores para vigilar tu hogar o negocio desde el celular.' },
    { icon: 'chat', title: 'Asesoría para elegir tus productos', text: 'Te ayudamos a escoger lo que mejor se adapta a tu espacio.' },
    { icon: 'whatsapp', title: 'Atención personalizada por WhatsApp', text: 'Resuelve tus dudas y haz tu pedido de forma directa.' },
  ]),

  whatsapp_number: '',
  whatsapp_message:
    'Hola, SmartHome_Vpar. Estoy interesado en el producto {producto}, publicado por {precio}. ¿Me pueden brindar más información sobre su disponibilidad?',
  whatsapp_general_message: 'Hola, SmartHome_Vpar. Quisiera recibir asesoría sobre sus productos.',
  currency: 'COP',
  cart_enabled: '0',
  shipping_note: '',

  business_name: '',
  business_id: '',
  address: '',
  city: '',
  email: '',
  phone: '',
  hours: '',
  footer_text: 'Tienda de tecnología: cámaras de seguridad Wi-Fi, domótica, asistentes de voz e interruptores inteligentes.',
  social_instagram: '',
  social_facebook: '',
  social_tiktok: '',
  social_youtube: '',

  policy_privacy: '',
  policy_shipping: '',
  policy_returns: '',
  policy_warranty: '',

  site_url: '',
  seo_title: 'SmartHome_Vpar | Cámaras Wi-Fi, domótica y hogar inteligente en Colombia',
  seo_description:
    'Tienda de tecnología en Colombia: cámaras de seguridad Wi-Fi, cámaras para exteriores, asistentes Alexa, interruptores y enchufes inteligentes, iluminación y sensores para tu hogar inteligente.',
  og_image: '',
};

const FONTS = ['Inter', 'Sora', 'Poppins', 'Montserrat', 'Space Grotesk', 'Exo 2', 'Rajdhani', 'Roboto', 'Sistema'];

const POLICIES = {
  privacidad: { key: 'policy_privacy', title: 'Política de privacidad' },
  envios: { key: 'policy_shipping', title: 'Política de envíos' },
  devoluciones: { key: 'policy_returns', title: 'Cambios y devoluciones' },
  garantias: { key: 'policy_warranty', title: 'Garantías' },
};

function all() {
  const rows = db.get().prepare('SELECT key, value FROM settings').all();
  const out = { ...DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  try {
    out.benefitsList = JSON.parse(out.benefits || '[]');
  } catch {
    out.benefitsList = [];
  }
  return out;
}

function set(values) {
  const stmt = db.get().prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  db.tx(() => {
    for (const [k, v] of Object.entries(values)) {
      if (!(k in DEFAULTS)) continue;
      stmt.run(k, v === null || v === undefined ? '' : String(v));
    }
  });
}

module.exports = { DEFAULTS, FONTS, POLICIES, all, set };
