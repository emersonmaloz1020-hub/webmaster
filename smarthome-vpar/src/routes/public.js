'use strict';
const express = require('express');
const crypto = require('node:crypto');
const catalog = require('../catalog');
const settings = require('../settings');
const db = require('../db');
const h = require('../helpers');

const router = express.Router();

const toArray = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]).map(String).filter(Boolean).slice(0, 20);

// ---------------------------------------------------------------- Inicio
router.get('/', (req, res) => {
  const s = res.locals.s;
  const featured = catalog.searchProducts({ featured: true, limit: 8 }).items;
  const offers = catalog.searchProducts({ offers: true, limit: 4, sort: 'recientes' }).items;
  res.render('home', {
    featured,
    offers,
    promotions: catalog.listPromotions({ onlyCurrent: true }),
    categories: res.locals.navCategories,
    meta: {
      title: s.seo_title,
      description: s.seo_description,
      image: s.og_image || s.hero_image,
      canonical: '/',
    },
  });
});

// ---------------------------------------------------------------- Catálogo
function renderCatalog(req, res, { category = null } = {}) {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const filters = {
    q,
    brands: toArray(req.query.marca),
    connectivity: toArray(req.query.conectividad),
    compatibility: toArray(req.query.compatibilidad),
    min: h.parsePrice(req.query.min),
    max: h.parsePrice(req.query.max),
    offers: req.query.ofertas === '1',
    inStock: req.query.disponibles === '1',
    sort: catalog.SORTS[req.query.orden] ? req.query.orden : 'relevancia',
    page: Number(req.query.pagina) || 1,
    limit: 12,
  };
  let catIds = [];
  const selectedCats = toArray(req.query.categoria);
  if (category) {
    catIds = [category.id, ...catalog.listCategories().filter((c) => c.parent_id === category.id).map((c) => c.id)];
  } else if (selectedCats.length) {
    const all = catalog.listCategories();
    for (const slug of selectedCats) {
      const c = all.find((x) => x.slug === slug);
      if (c) catIds.push(c.id, ...all.filter((x) => x.parent_id === c.id).map((x) => x.id));
    }
    if (!catIds.length) catIds = [-1];
  }
  filters.categoryIds = catIds;
  const result = catalog.searchProducts(filters);
  const s = res.locals.s;

  // Construye URLs conservando los filtros actuales.
  const buildUrl = (changes = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      for (const val of toArray(v)) params.append(k, val);
    }
    for (const [k, v] of Object.entries(changes)) {
      params.delete(k);
      if (v !== null && v !== undefined && v !== '') params.set(k, v);
    }
    const qs = params.toString();
    return `${req.path}${qs ? `?${qs}` : ''}`;
  };

  let title = 'Catálogo de productos';
  let description = `Catálogo de ${s.store_name}: cámaras Wi-Fi, cámaras de seguridad, domótica, asistentes de voz e interruptores inteligentes en Colombia.`;
  if (category) {
    title = category.seo_title || `${category.name} | ${s.store_name}`;
    description = category.seo_description || category.description || description;
  } else if (q) {
    title = `Resultados para “${q}”`;
  } else if (filters.offers) {
    title = 'Ofertas y promociones';
  }

  res.render('catalog', {
    category,
    subcategories: category ? catalog.listCategories().filter((c) => c.parent_id === category.id) : [],
    result,
    filters,
    selectedCats,
    facets: catalog.facets(),
    buildUrl,
    query: req.query,
    meta: {
      title,
      description,
      image: category && category.image ? category.image : null,
      canonical: category ? `/categoria/${category.slug}` : '/catalogo',
      noindex: !!(q || Object.keys(req.query).length > 0),
    },
  });
}

router.get('/catalogo', (req, res) => renderCatalog(req, res));
router.get('/buscar', (req, res) => res.redirect(301, `/catalogo?q=${encodeURIComponent(req.query.q || '')}`));
router.get('/ofertas', (req, res) => {
  req.query.ofertas = '1';
  renderCatalog(req, res);
});

router.get('/categoria/:slug', (req, res, next) => {
  const category = catalog.getCategoryBySlug(req.params.slug);
  if (!category || !category.active) return next();
  renderCatalog(req, res, { category });
});

// ---------------------------------------------------------------- Ficha de producto
router.get('/producto/:slug', (req, res, next) => {
  const p = catalog.getProductBySlug(req.params.slug);
  if (!p || (!p.active && !req.admin)) return next();
  const s = res.locals.s;
  const origin = res.locals.origin;
  const abs = (u) => (u && u.startsWith('/') ? origin + u : u);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.short_description || h.truncate(p.description, 300),
    image: p.images.map((i) => abs(i.path)),
    sku: p.model || String(p.id),
    category: p.category ? p.category.name : undefined,
    offers: {
      '@type': 'Offer',
      url: `${origin}/producto/${p.slug}`,
      priceCurrency: 'COP',
      price: p.pricing.current,
      availability: p.avail.schema,
      seller: { '@type': 'Organization', name: s.business_name || s.store_name },
    },
  };
  if (p.brand) jsonLd.brand = { '@type': 'Brand', name: p.brand };
  if (p.model) jsonLd.model = p.model;

  res.render('product', {
    p,
    specs: h.parseSpecs(p.specs),
    related: catalog.relatedProducts(p),
    jsonLd: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
    meta: {
      title: p.seo_title || `${p.name} | ${s.store_name}`,
      description: p.seo_description || p.short_description || h.truncate(p.description, 155),
      image: p.image ? p.image.path : null,
      canonical: `/producto/${p.slug}`,
      type: 'product',
      noindex: !p.active,
    },
  });
});

// ---------------------------------------------------------------- Políticas
router.get('/politicas/:key', (req, res, next) => {
  const pol = settings.POLICIES[req.params.key];
  const s = res.locals.s;
  if (!pol || !String(s[pol.key] || '').trim()) return next();
  res.render('page', {
    title: pol.title,
    body: s[pol.key],
    meta: { title: `${pol.title} | ${s.store_name}`, canonical: `/politicas/${req.params.key}` },
  });
});

router.get('/contacto', (req, res) => {
  res.render('contact', { meta: { title: `Contacto | ${res.locals.s.store_name}`, canonical: '/contacto' } });
});

// ---------------------------------------------------------------- Carrito y pedidos (modalidad ampliada)
router.get('/carrito', (req, res, next) => {
  if (!res.locals.cartEnabled) return next();
  res.render('cart', { meta: { title: `Carrito | ${res.locals.s.store_name}`, noindex: true } });
});

// Información actualizada de productos para el carrito (precios siempre desde el servidor).
router.get('/api/productos', (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .slice(0, 50);
  const items = catalog.getProductsByIds(ids).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: p.pricing.current,
    priceText: h.formatCOP(p.pricing.current),
    image: p.image ? p.image.path : null,
    available: p.avail.key !== 'agotado',
    availability: p.avail.label,
  }));
  res.json({ items });
});

const orderLimiter = new Map();
router.post('/api/pedidos', (req, res) => {
  if (!res.locals.cartEnabled) return res.status(404).json({ error: 'El carrito no está habilitado.' });
  const ip = req.ip;
  const now = Date.now();
  const hits = (orderLimiter.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 5) return res.status(429).json({ error: 'Demasiados pedidos seguidos. Intenta de nuevo en unos minutos.' });

  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0, 80);
  const phone = h.onlyDigits(body.phone).slice(0, 15);
  const city = String(body.city || '').trim().slice(0, 80);
  const notes = String(body.notes || '').trim().slice(0, 500);
  if (name.length < 2) return res.status(400).json({ error: 'Escribe tu nombre.' });
  if (phone.length < 7) return res.status(400).json({ error: 'Escribe un número de teléfono válido.' });
  const reqItems = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  const qty = new Map();
  for (const it of reqItems) {
    const id = Number(it.id);
    const q = Math.min(99, Math.max(1, Math.floor(Number(it.qty) || 1)));
    if (Number.isInteger(id) && id > 0) qty.set(id, q);
  }
  const products = catalog.getProductsByIds([...qty.keys()]).filter((p) => p.avail.key !== 'agotado');
  if (!products.length) return res.status(400).json({ error: 'Tu carrito está vacío o los productos no están disponibles.' });

  const items = products.map((p) => ({
    id: p.id,
    name: p.name,
    qty: qty.get(p.id),
    price: p.pricing.current,
    subtotal: p.pricing.current * qty.get(p.id),
  }));
  const total = items.reduce((a, i) => a + i.subtotal, 0);
  const code = `PED-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  db.get()
    .prepare(
      'INSERT INTO orders (code, customer_name, customer_phone, customer_city, notes, items_json, total) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(code, name, phone, city, notes, JSON.stringify(items), total);
  hits.push(now);
  orderLimiter.set(ip, hits);

  const s = res.locals.s;
  const lines = items.map((i) => `• ${i.qty} x ${i.name} — ${h.formatCOP(i.subtotal)}`);
  const msg = [
    `Hola, ${s.store_name}. Quiero hacer el pedido ${code}:`,
    ...lines,
    `Total: ${h.formatCOP(total)}`,
    '',
    `Nombre: ${name}`,
    `Teléfono: ${phone}`,
    city ? `Ciudad: ${city}` : null,
    notes ? `Notas: ${notes}` : null,
  ]
    .filter((l) => l !== null)
    .join('\n');
  res.json({ ok: true, code, total, totalText: h.formatCOP(total), whatsapp: h.whatsappLink(s.whatsapp_number, msg) });
});

// ---------------------------------------------------------------- SEO
router.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /carrito\nDisallow: /api/\n\nSitemap: ${res.locals.origin}/sitemap.xml\n`);
});

router.get('/sitemap.xml', (req, res) => {
  const origin = res.locals.origin;
  const urls = [{ loc: '/', priority: '1.0' }, { loc: '/catalogo', priority: '0.8' }, { loc: '/contacto', priority: '0.4' }];
  for (const c of catalog.listCategories()) urls.push({ loc: `/categoria/${c.slug}`, priority: '0.8' });
  for (const p of catalog.searchProducts({ limit: 200 }).items) {
    urls.push({ loc: `/producto/${p.slug}`, lastmod: String(p.updated_at || '').slice(0, 10), priority: '0.7' });
  }
  const s = res.locals.s;
  for (const [slug, pol] of Object.entries(settings.POLICIES)) {
    if (String(s[pol.key] || '').trim()) urls.push({ loc: `/politicas/${slug}`, priority: '0.2' });
  }
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (u) =>
        `  <url><loc>${esc(origin + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
    )
    .join('\n')}\n</urlset>\n`;
  res.type('application/xml').send(xml);
});

router.get('/healthz', (req, res) => res.json({ ok: true }));

module.exports = router;
