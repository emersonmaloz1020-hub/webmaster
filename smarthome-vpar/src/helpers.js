'use strict';

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function formatCOP(value) {
  if (value === null || value === undefined || value === '') return '';
  return copFormatter.format(Number(value)).replace(/ /g, ' ');
}

// Convierte "1.299.900", "$ 1299900" o "1299900" a entero. Devuelve null si está vacío.
function parsePrice(input) {
  if (input === null || input === undefined) return null;
  const digits = String(input).replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function slugify(str) {
  return normalizeText(str)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

function isHexColor(v) {
  return /^#[0-9a-fA-F]{6}$/.test(String(v || ''));
}

function todayISO() {
  const d = new Date();
  // Fecha local de Colombia (UTC-5, sin horario de verano).
  const co = new Date(d.getTime() - 5 * 3600 * 1000);
  return co.toISOString().slice(0, 10);
}

// Precio efectivo: el promocional aplica si existe, es menor al precio normal y está vigente.
function priceInfo(p) {
  const today = todayISO();
  const promoValid =
    p.promo_price !== null &&
    p.promo_price !== undefined &&
    p.promo_price > 0 &&
    p.promo_price < p.price &&
    (!p.promo_starts || p.promo_starts <= today) &&
    (!p.promo_ends || p.promo_ends >= today);
  const current = promoValid ? p.promo_price : p.price;
  return {
    current,
    previous: promoValid ? p.price : null,
    onSale: promoValid,
    discount: promoValid ? Math.round((1 - p.promo_price / p.price) * 100) : 0,
  };
}

const AVAILABILITY = {
  disponible: { label: 'Disponible', schema: 'https://schema.org/InStock', css: 'ok' },
  pocas: { label: 'Pocas unidades', schema: 'https://schema.org/LimitedAvailability', css: 'warn' },
  pedido: { label: 'Bajo pedido', schema: 'https://schema.org/PreOrder', css: 'info' },
  agotado: { label: 'Agotado', schema: 'https://schema.org/OutOfStock', css: 'off' },
};

function availabilityOf(p) {
  let key = p.availability || 'disponible';
  if (p.stock !== null && p.stock !== undefined && p.stock <= 0 && key !== 'pedido') key = 'agotado';
  return { key, ...(AVAILABILITY[key] || AVAILABILITY.disponible) };
}

function splitList(str) {
  return String(str || '')
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// "Clave: valor" por línea → [{label, value}]
function parseSpecs(str) {
  return String(str || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(':');
      return i > 0 ? { label: l.slice(0, i).trim(), value: l.slice(i + 1).trim() } : { label: '', value: l };
    });
}

function onlyDigits(str) {
  return String(str || '').replace(/[^\d]/g, '');
}

function fillTemplate(tpl, vars) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function whatsappLink(number, message) {
  const n = onlyDigits(number);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(message || '')}`;
}

function truncate(str, n) {
  const s = String(str || '');
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

function safeUrl(u) {
  const s = String(u || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return '';
}

module.exports = {
  formatCOP,
  parsePrice,
  normalizeText,
  slugify,
  isHexColor,
  todayISO,
  priceInfo,
  availabilityOf,
  AVAILABILITY,
  splitList,
  parseSpecs,
  onlyDigits,
  fillTemplate,
  whatsappLink,
  truncate,
  safeUrl,
};
