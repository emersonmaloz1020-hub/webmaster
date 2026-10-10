'use strict';
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const config = require('../config');
const db = require('../db');
const auth = require('../auth');
const settings = require('../settings');
const catalog = require('../catalog');
const seed = require('../seed');
const h = require('../helpers');
const { upload, saveImage, removeImage, friendlyError } = require('../uploads');
const { CHOICES: ICON_CHOICES } = require('../icons');

const router = express.Router();

const bool = (v) => v === '1' || v === 'on' || v === 'true' || v === true;
const arr = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const str = (v, max = 5000) => String(v ?? '').trim().slice(0, max);
const isDate = (v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);

// No indexar ni almacenar en caché las páginas del panel.
router.use((req, res, next) => {
  res.set({ 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
  next();
});

// Mensajes de confirmación ("flash") guardados en una cookie de un solo uso.
router.use((req, res, next) => {
  const raw = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith('shv_flash='));
  if (raw) {
    try {
      res.locals.flash = JSON.parse(decodeURIComponent(raw.slice('shv_flash='.length)));
    } catch {
      res.locals.flash = null;
    }
    res.clearCookie('shv_flash', { path: '/admin' });
  }
  req.flash = (type, text) =>
    res.cookie('shv_flash', JSON.stringify({ type, text }), { httpOnly: true, sameSite: 'lax', path: '/admin', maxAge: 60000 });
  res.locals.iconChoices = ICON_CHOICES;
  next();
});

// ---------------------------------------------------------------- Acceso
router.get('/login', (req, res) => {
  if (auth.adminCount() === 0) return res.redirect('/admin/setup');
  if (req.admin) return res.redirect('/admin');
  res.render('admin/login', { error: null, next: str(req.query.next, 300), meta: { title: 'Iniciar sesión' } });
});

router.post('/login', (req, res) => {
  const ip = req.ip;
  const next = str(req.body.next, 300);
  const safeNext = next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin';
  const fail = (error) => res.status(401).render('admin/login', { error, next, meta: { title: 'Iniciar sesión' } });
  if (auth.tooManyAttempts(ip)) return fail('Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.');
  const admin = auth.findAdmin(req.body.username);
  if (!admin || !auth.verifyPassword(String(req.body.password || ''), admin.password_hash)) {
    auth.registerFailure(ip);
    return fail('Usuario o contraseña incorrectos.');
  }
  auth.clearFailures(ip);
  auth.createSession(res, admin.id);
  res.redirect(safeNext);
});

router.get('/setup', (req, res) => {
  if (auth.adminCount() > 0) return res.redirect('/admin/login');
  const code = auth.getSetupCode();
  console.log(`\n[SmartHome_Vpar] Código de configuración inicial del panel: ${code}\n`);
  res.render('admin/setup', { error: null, values: {}, meta: { title: 'Configuración inicial' } });
});

router.post('/setup', (req, res) => {
  if (auth.adminCount() > 0) return res.redirect('/admin/login');
  const values = { username: str(req.body.username, 40) };
  const fail = (error) => res.status(400).render('admin/setup', { error, values, meta: { title: 'Configuración inicial' } });
  if (str(req.body.code).toUpperCase() !== auth.getSetupCode()) return fail('El código de configuración no es correcto. Consulta la consola (registros) del servidor.');
  if (req.body.password !== req.body.password2) return fail('Las contraseñas no coinciden.');
  try {
    auth.createAdmin(req.body.username, req.body.password);
  } catch (e) {
    return fail(e.message);
  }
  auth.resetSetupCode();
  const admin = auth.findAdmin(req.body.username);
  auth.createSession(res, admin.id);
  req.flash('ok', '¡Cuenta de administrador creada! Bienvenido al panel.');
  res.redirect('/admin');
});

// A partir de aquí todo requiere sesión iniciada.
router.use(auth.requireAdmin);

// Procesa formularios con archivos antes de verificar el token CSRF.
router.use((req, res, next) => {
  if (req.method !== 'POST') return next();
  if (!req.is('multipart/form-data')) return auth.requireCsrf(req, res, next);
  upload.any()(req, res, (err) => {
    if (err) {
      req.flash('error', friendlyError(err));
      return res.redirect(req.get('referer') && req.get('referer').includes('/admin') ? req.get('referer') : '/admin');
    }
    auth.requireCsrf(req, res, next);
  });
});

const filesFor = (req, field) => (req.files || []).filter((f) => f.fieldname === field && f.size > 0);

router.post('/logout', (req, res) => {
  auth.destroySession(req, res);
  res.redirect('/admin/login');
});

// ---------------------------------------------------------------- Escritorio
router.get('/', (req, res) => {
  const d = db.get();
  const s = res.locals.s;
  const count = (sql) => d.prepare(sql).get().n;
  const pending = [];
  if (!h.onlyDigits(s.whatsapp_number)) pending.push({ text: 'Configura el número de WhatsApp para activar los botones de compra y consulta.', link: '/admin/configuracion#whatsapp' });
  if (!s.site_url) pending.push({ text: 'Indica la dirección pública (dominio) de la tienda para los enlaces compartidos y el sitemap.', link: '/admin/configuracion#seo' });
  if (seed.demoCount() > 0) pending.push({ text: `Hay ${seed.demoCount()} productos de demostración. Reemplázalos por tus productos reales o elimínalos.`, link: '/admin/respaldo' });
  if (!s.email && !s.phone && !s.address) pending.push({ text: 'Agrega tus datos de contacto (correo, teléfono o dirección).', link: '/admin/configuracion#contacto' });
  if (!s.policy_privacy) pending.push({ text: 'Redacta tu política de privacidad y tratamiento de datos.', link: '/admin/configuracion#politicas' });
  res.render('admin/dashboard', {
    stats: {
      products: count('SELECT COUNT(*) AS n FROM products'),
      active: count('SELECT COUNT(*) AS n FROM products WHERE active = 1'),
      categories: count('SELECT COUNT(*) AS n FROM categories'),
      outOfStock: count("SELECT COUNT(*) AS n FROM products WHERE availability = 'agotado' OR (stock IS NOT NULL AND stock <= 0 AND availability != 'pedido')"),
      orders: count("SELECT COUNT(*) AS n FROM orders WHERE status = 'nuevo'"),
    },
    pending,
    recent: d.prepare('SELECT id, name, updated_at FROM products ORDER BY updated_at DESC LIMIT 5').all(),
    meta: { title: 'Panel' },
  });
});

// ---------------------------------------------------------------- Productos
router.get('/productos', (req, res) => {
  const q = str(req.query.q, 100);
  const cat = Number(req.query.categoria) || null;
  const estado = req.query.estado || '';
  const result = catalog.searchProducts({
    q,
    categoryIds: cat ? [cat] : [],
    includeInactive: true,
    sort: 'recientes',
    limit: 200,
  });
  let items = result.items;
  if (estado === 'activos') items = items.filter((p) => p.active);
  if (estado === 'inactivos') items = items.filter((p) => !p.active);
  if (estado === 'destacados') items = items.filter((p) => p.featured);
  if (estado === 'agotados') items = items.filter((p) => p.avail.key === 'agotado');
  res.render('admin/products', {
    items,
    q,
    cat,
    estado,
    categories: catalog.listCategories({ includeHidden: true }),
    meta: { title: 'Productos' },
  });
});

function productForm(res, product, errors = []) {
  res.status(errors.length ? 400 : 200).render('admin/product-form', {
    p: product,
    errors,
    categories: catalog.categoryTree({ includeHidden: true }),
    availability: h.AVAILABILITY,
    meta: { title: product.id ? `Editar: ${product.name}` : 'Nuevo producto' },
  });
}

const EMPTY_PRODUCT = {
  name: '', slug: '', brand: '', model: '', short_description: '', description: '', specs: '', connectivity: '', compatibility: '',
  box_contents: '', keywords: '', price: '', promo_price: '', promo_starts: '', promo_ends: '', stock: '', availability: 'disponible',
  featured: 0, is_new: 1, is_offer: 0, active: 1, sort_order: 0, seo_title: '', seo_description: '', images: [], categories: [],
};

router.get('/productos/nuevo', (req, res) => {
  const pre = Number(req.query.categoria);
  productForm(res, { ...EMPTY_PRODUCT, categories: pre ? [{ id: pre }] : [] });
});

router.get('/productos/:id', (req, res, next) => {
  const p = catalog.getProduct(req.params.id);
  if (!p) return next();
  productForm(res, p);
});

function readProduct(body) {
  const data = {
    name: str(body.name, 150),
    slug: str(body.slug, 80),
    brand: str(body.brand, 80),
    model: str(body.model, 80),
    short_description: str(body.short_description, 300),
    description: str(body.description, 8000),
    specs: str(body.specs, 5000),
    connectivity: str(body.connectivity, 300),
    compatibility: str(body.compatibility, 300),
    box_contents: str(body.box_contents, 2000),
    keywords: str(body.keywords, 300),
    price: h.parsePrice(body.price),
    promo_price: h.parsePrice(body.promo_price),
    promo_starts: str(body.promo_starts, 10) || null,
    promo_ends: str(body.promo_ends, 10) || null,
    stock: str(body.stock) === '' ? null : Number.parseInt(body.stock, 10),
    availability: str(body.availability, 20),
    featured: bool(body.featured),
    is_new: bool(body.is_new),
    is_offer: bool(body.is_offer),
    active: bool(body.active),
    sort_order: Number.parseInt(body.sort_order, 10) || 0,
    seo_title: str(body.seo_title, 120),
    seo_description: str(body.seo_description, 300),
    category_ids: arr(body.category_ids).map(Number).filter(Boolean),
  };
  const errors = [];
  if (data.name.length < 2) errors.push('Escribe el nombre del producto.');
  if (!data.price || data.price <= 0) errors.push('Escribe un precio de venta válido (en pesos, sin decimales).');
  if (data.promo_price && data.price && data.promo_price >= data.price) errors.push('El precio promocional debe ser menor que el precio de venta.');
  if (data.stock !== null && (!Number.isInteger(data.stock) || data.stock < 0)) errors.push('Las existencias deben ser un número entero mayor o igual a 0 (o dejarse vacías).');
  if (!isDate(data.promo_starts) || !isDate(data.promo_ends)) errors.push('Las fechas de la promoción no son válidas.');
  if (data.promo_starts && data.promo_ends && data.promo_starts > data.promo_ends) errors.push('La fecha final de la promoción es anterior a la inicial.');
  if (!h.AVAILABILITY[data.availability]) data.availability = 'disponible';
  return { data, errors };
}

function attachImages(req, productId, altBase) {
  const problems = [];
  for (const f of filesFor(req, 'images')) {
    try {
      catalog.addImage(productId, saveImage(f), altBase);
    } catch (e) {
      problems.push(e.message);
    }
  }
  return problems;
}

router.post('/productos', (req, res) => {
  const { data, errors } = readProduct(req.body);
  if (errors.length) return productForm(res, { ...EMPTY_PRODUCT, ...data, categories: data.category_ids.map((id) => ({ id })) }, errors);
  const id = catalog.saveProduct(data, null);
  const problems = attachImages(req, id, data.name);
  req.flash(problems.length ? 'warn' : 'ok', problems.length ? `Producto creado, pero algunas imágenes no se guardaron: ${problems.join(' ')}` : 'Producto creado correctamente.');
  res.redirect(`/admin/productos/${id}`);
});

router.post('/productos/:id', (req, res, next) => {
  const current = catalog.getProduct(req.params.id);
  if (!current) return next();
  const { data, errors } = readProduct(req.body);
  if (errors.length) return productForm(res, { ...current, ...data, categories: data.category_ids.map((id) => ({ id })) }, errors);
  catalog.saveProduct(data, current.id);
  // Textos alternativos de imágenes existentes.
  for (const img of current.images) {
    const alt = req.body[`alt_${img.id}`];
    if (alt !== undefined) catalog.updateImageAlt(img.id, str(alt, 200));
  }
  const problems = attachImages(req, current.id, data.name);
  req.flash(problems.length ? 'warn' : 'ok', problems.length ? `Cambios guardados, pero algunas imágenes no se guardaron: ${problems.join(' ')}` : 'Cambios guardados correctamente.');
  res.redirect(`/admin/productos/${current.id}`);
});

router.post('/productos/:id/eliminar', (req, res) => {
  const p = catalog.getProduct(req.params.id);
  if (p) {
    catalog.deleteProduct(p.id).forEach(removeImage);
    req.flash('ok', `Producto “${p.name}” eliminado.`);
  }
  res.redirect('/admin/productos');
});

router.post('/productos/:id/estado', (req, res) => {
  const p = catalog.getProduct(req.params.id);
  const field = str(req.body.field, 20);
  if (p && ['active', 'featured', 'is_new', 'is_offer'].includes(field)) {
    catalog.setProductFlag(p.id, field, !p[field]);
    const labels = { active: ['activado', 'desactivado'], featured: ['marcado como destacado', 'quitado de destacados'], is_new: ['marcado como nuevo', 'sin etiqueta de nuevo'], is_offer: ['marcado en oferta', 'sin etiqueta de oferta'] };
    req.flash('ok', `“${p.name}” ${labels[field][p[field] ? 1 : 0]}.`);
  }
  res.redirect(req.get('referer') && req.get('referer').includes('/admin/productos') ? req.get('referer') : '/admin/productos');
});

router.post('/productos/:id/duplicar', (req, res) => {
  const p = catalog.getProduct(req.params.id);
  if (!p) return res.redirect('/admin/productos');
  const id = catalog.saveProduct(
    { ...p, name: `${p.name} (copia)`, slug: '', active: false, is_demo: false, category_ids: p.categories.map((c) => c.id) },
    null
  );
  req.flash('ok', 'Producto duplicado. La copia está desactivada hasta que la revises. Agrega sus fotografías.');
  res.redirect(`/admin/productos/${id}`);
});

router.post('/imagenes/:id/:accion', (req, res) => {
  const img = catalog.getImage(req.params.id);
  if (!img) return res.redirect('/admin/productos');
  const action = req.params.accion;
  if (action === 'eliminar') {
    catalog.deleteImage(img.id);
    removeImage(img.path);
    req.flash('ok', 'Imagen eliminada.');
  } else if (['main', 'up', 'down'].includes(action)) {
    catalog.moveImage(img.id, action);
    req.flash('ok', action === 'main' ? 'Imagen principal actualizada.' : 'Orden de imágenes actualizado.');
  }
  res.redirect(`/admin/productos/${img.product_id}#imagenes`);
});

// ---------------------------------------------------------------- Categorías
router.get('/categorias', (req, res) => {
  res.render('admin/categories', { tree: catalog.categoryTree({ includeHidden: true }), meta: { title: 'Categorías' } });
});

function categoryForm(res, c, errors = []) {
  res.status(errors.length ? 400 : 200).render('admin/category-form', {
    c,
    errors,
    parents: catalog.listCategories({ includeHidden: true }).filter((x) => x.id !== c.id && !x.parent_id),
    meta: { title: c.id ? `Editar: ${c.name}` : 'Nueva categoría' },
  });
}

const EMPTY_CATEGORY = { name: '', slug: '', description: '', image: '', icon: 'home', parent_id: null, sort_order: 0, active: 1, seo_title: '', seo_description: '' };

router.get('/categorias/nueva', (req, res) => {
  const max = db.get().prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM categories').get().m;
  categoryForm(res, { ...EMPTY_CATEGORY, sort_order: max + 10 });
});

router.get('/categorias/:id', (req, res, next) => {
  const c = catalog.getCategory(req.params.id);
  if (!c) return next();
  categoryForm(res, c);
});

function readCategory(req, current) {
  const b = req.body;
  const data = {
    name: str(b.name, 100),
    slug: str(b.slug, 80),
    description: str(b.description, 500),
    icon: ICON_CHOICES.includes(b.icon) ? b.icon : 'home',
    parent_id: Number(b.parent_id) || null,
    sort_order: Number.parseInt(b.sort_order, 10) || 0,
    active: bool(b.active),
    seo_title: str(b.seo_title, 120),
    seo_description: str(b.seo_description, 300),
  };
  const errors = [];
  if (data.name.length < 2) errors.push('Escribe el nombre de la categoría.');
  if (data.parent_id && current && db.get().prepare('SELECT 1 FROM categories WHERE parent_id = ?').get(current.id)) {
    errors.push('Esta categoría tiene subcategorías, por lo que no puede convertirse en subcategoría.');
  }
  const file = filesFor(req, 'image')[0];
  if (file && !errors.length) {
    try {
      data.image = saveImage(file);
      if (current) removeImage(current.image);
    } catch (e) {
      errors.push(e.message);
    }
  } else if (bool(b.remove_image) && current) {
    data.image = '';
    removeImage(current.image);
  }
  return { data, errors };
}

router.post('/categorias', (req, res) => {
  const { data, errors } = readCategory(req, null);
  if (errors.length) return categoryForm(res, { ...EMPTY_CATEGORY, ...data }, errors);
  const id = catalog.saveCategory(data, null);
  req.flash('ok', 'Categoría creada correctamente.');
  res.redirect(`/admin/categorias/${id}`);
});

router.post('/categorias/:id', (req, res, next) => {
  const current = catalog.getCategory(req.params.id);
  if (!current) return next();
  const { data, errors } = readCategory(req, current);
  if (errors.length) return categoryForm(res, { ...current, ...data }, errors);
  catalog.saveCategory(data, current.id);
  if (current.name !== data.name) catalog.reindexAll();
  req.flash('ok', 'Categoría actualizada correctamente.');
  res.redirect(`/admin/categorias/${current.id}`);
});

router.post('/categorias/:id/eliminar', (req, res) => {
  const c = catalog.getCategory(req.params.id);
  if (c) {
    catalog.deleteCategory(c.id);
    removeImage(c.image);
    catalog.reindexAll();
    req.flash('ok', `Categoría “${c.name}” eliminada. Sus productos se conservaron.`);
  }
  res.redirect('/admin/categorias');
});

router.post('/categorias/:id/mover', (req, res) => {
  catalog.moveCategory(req.params.id, req.body.dir === 'up' ? 'up' : 'down');
  res.redirect('/admin/categorias');
});

router.post('/categorias/:id/estado', (req, res) => {
  const c = catalog.getCategory(req.params.id);
  if (c) {
    db.get().prepare('UPDATE categories SET active = ? WHERE id = ?').run(c.active ? 0 : 1, c.id);
    req.flash('ok', `Categoría “${c.name}” ${c.active ? 'ocultada' : 'visible'}.`);
  }
  res.redirect('/admin/categorias');
});

// ---------------------------------------------------------------- Promociones
router.get('/promociones', (req, res) => {
  res.render('admin/promotions', { items: catalog.listPromotions(), today: h.todayISO(), meta: { title: 'Promociones' } });
});

function promoForm(res, pr, errors = []) {
  res.status(errors.length ? 400 : 200).render('admin/promotion-form', { pr, errors, meta: { title: pr.id ? 'Editar promoción' : 'Nueva promoción' } });
}
const EMPTY_PROMO = { title: '', subtitle: '', image: '', button_text: 'Ver más', link_url: '', starts_at: '', ends_at: '', active: 1, sort_order: 0 };

router.get('/promociones/nueva', (req, res) => promoForm(res, { ...EMPTY_PROMO }));
router.get('/promociones/:id', (req, res, next) => {
  const pr = catalog.getPromotion(req.params.id);
  if (!pr) return next();
  promoForm(res, pr);
});

function readPromo(req, current) {
  const b = req.body;
  const data = {
    title: str(b.title, 120),
    subtitle: str(b.subtitle, 300),
    button_text: str(b.button_text, 40),
    link_url: h.safeUrl(str(b.link_url, 300)),
    starts_at: str(b.starts_at, 10) || null,
    ends_at: str(b.ends_at, 10) || null,
    active: bool(b.active),
    sort_order: Number.parseInt(b.sort_order, 10) || 0,
  };
  const errors = [];
  if (data.title.length < 2) errors.push('Escribe el título de la promoción.');
  if (str(b.link_url) && !data.link_url) errors.push('El enlace debe empezar por "/" (página de la tienda) o por "https://".');
  if (!isDate(data.starts_at) || !isDate(data.ends_at)) errors.push('Las fechas de vigencia no son válidas.');
  if (data.starts_at && data.ends_at && data.starts_at > data.ends_at) errors.push('La fecha final es anterior a la inicial.');
  const file = filesFor(req, 'image')[0];
  if (file && !errors.length) {
    try {
      data.image = saveImage(file);
      if (current) removeImage(current.image);
    } catch (e) {
      errors.push(e.message);
    }
  } else if (bool(b.remove_image) && current) {
    data.image = '';
    removeImage(current.image);
  }
  return { data, errors };
}

router.post('/promociones', (req, res) => {
  const { data, errors } = readPromo(req, null);
  if (errors.length) return promoForm(res, { ...EMPTY_PROMO, ...data }, errors);
  catalog.savePromotion(data, null);
  req.flash('ok', 'Promoción creada correctamente.');
  res.redirect('/admin/promociones');
});

router.post('/promociones/:id', (req, res, next) => {
  const current = catalog.getPromotion(req.params.id);
  if (!current) return next();
  const { data, errors } = readPromo(req, current);
  if (errors.length) return promoForm(res, { ...current, ...data }, errors);
  catalog.savePromotion(data, current.id);
  req.flash('ok', 'Promoción actualizada correctamente.');
  res.redirect('/admin/promociones');
});

router.post('/promociones/:id/eliminar', (req, res) => {
  const pr = catalog.getPromotion(req.params.id);
  if (pr) {
    catalog.deletePromotion(pr.id);
    removeImage(pr.image);
    req.flash('ok', 'Promoción eliminada.');
  }
  res.redirect('/admin/promociones');
});

// ---------------------------------------------------------------- Apariencia
router.get('/apariencia', (req, res) => {
  res.render('admin/appearance', { fonts: settings.FONTS, defaults: settings.DEFAULTS, meta: { title: 'Apariencia' } });
});

const IMAGE_SETTINGS = { logo: 'logo', favicon: 'favicon', hero_image: 'hero_image', og_image: 'og_image' };

router.post('/apariencia', (req, res) => {
  const b = req.body;
  const s = res.locals.s;
  const values = {};
  const problems = [];

  if (bool(b.reset_colors)) {
    for (const k of ['color_bg', 'color_surface', 'color_primary', 'color_accent', 'color_text']) values[k] = settings.DEFAULTS[k];
  } else {
    for (const k of ['color_bg', 'color_surface', 'color_primary', 'color_accent', 'color_text']) {
      if (h.isHexColor(b[k])) values[k] = b[k].toLowerCase();
    }
  }
  for (const k of ['font_body', 'font_heading']) if (settings.FONTS.includes(b[k])) values[k] = b[k];
  for (const k of [
    'store_name', 'tagline', 'hero_title', 'hero_subtitle', 'hero_text', 'hero_btn_primary', 'hero_btn_whatsapp',
    'categories_title', 'categories_text', 'featured_title', 'featured_text', 'promos_title', 'promos_text', 'benefits_title', 'footer_text',
  ]) {
    if (b[k] !== undefined) values[k] = str(b[k], 400);
  }
  if (!values.store_name) values.store_name = settings.DEFAULTS.store_name;

  // Beneficios configurables.
  const titles = arr(b.benefit_title);
  const texts = arr(b.benefit_text);
  const icons = arr(b.benefit_icon);
  values.benefits = JSON.stringify(
    titles
      .map((t, i) => ({ title: str(t, 80), text: str(texts[i], 200), icon: ICON_CHOICES.includes(icons[i]) ? icons[i] : 'star' }))
      .filter((x) => x.title)
  );

  // Imágenes: logotipo, favicon, banner principal e imagen para redes sociales.
  for (const [field, key] of Object.entries(IMAGE_SETTINGS)) {
    const file = filesFor(req, field)[0];
    if (file) {
      try {
        values[key] = saveImage(file);
        removeImage(s[key]);
      } catch (e) {
        problems.push(e.message);
      }
    } else if (bool(b[`remove_${field}`])) {
      values[key] = key === 'hero_image' ? settings.DEFAULTS.hero_image : '';
      removeImage(s[key]);
    }
  }
  settings.set(values);
  req.flash(problems.length ? 'warn' : 'ok', problems.length ? `Cambios guardados, excepto: ${problems.join(' ')}` : 'Apariencia actualizada. Los cambios ya se ven en la tienda.');
  res.redirect('/admin/apariencia');
});

// ---------------------------------------------------------------- Configuración comercial
router.get('/configuracion', (req, res) => {
  res.render('admin/settings', { meta: { title: 'Configuración' } });
});

router.post('/configuracion', (req, res) => {
  const b = req.body;
  const values = {};
  const errors = [];
  const wa = h.onlyDigits(b.whatsapp_number);
  if (b.whatsapp_number === undefined) {
    // campo no enviado: se conserva el valor actual
  } else if (wa && (wa.length < 10 || wa.length > 15)) errors.push('El número de WhatsApp debe incluir el indicativo del país, por ejemplo 573001234567 (Colombia: 57 + 10 dígitos).');
  else values.whatsapp_number = wa;
  for (const k of ['whatsapp_message', 'whatsapp_general_message', 'shipping_note', 'business_name', 'business_id', 'address', 'city', 'email', 'phone', 'hours', 'seo_title', 'seo_description']) {
    if (b[k] !== undefined) values[k] = str(b[k], 600);
  }
  if (values.whatsapp_message !== undefined && !values.whatsapp_message) values.whatsapp_message = settings.DEFAULTS.whatsapp_message;
  for (const k of ['policy_privacy', 'policy_shipping', 'policy_returns', 'policy_warranty']) {
    if (b[k] !== undefined) values[k] = str(b[k], 20000);
  }
  for (const k of ['social_instagram', 'social_facebook', 'social_tiktok', 'social_youtube']) {
    if (b[k] === undefined) continue;
    const v = str(b[k], 300);
    if (v && !/^https:\/\//i.test(v)) errors.push(`El enlace de ${k.replace('social_', '')} debe empezar por https://`);
    else values[k] = v;
  }
  const site = str(b.site_url, 200).replace(/\/+$/, '');
  if (b.site_url === undefined) {
    // se conserva
  } else if (site && !/^https?:\/\/[^\s/]+$/i.test(site)) errors.push('La dirección pública debe tener el formato https://midominio.com (sin rutas adicionales).');
  else values.site_url = site;
  values.cart_enabled = bool(b.cart_enabled) ? '1' : '0';
  values.currency = 'COP';
  settings.set(values);
  if (errors.length) req.flash('warn', `Se guardó lo demás, pero revisa: ${errors.join(' ')}`);
  else req.flash('ok', 'Configuración guardada correctamente.');
  res.redirect('/admin/configuracion');
});

// ---------------------------------------------------------------- Pedidos
const ORDER_STATUS = { nuevo: 'Nuevo', contactado: 'Contactado', confirmado: 'Confirmado', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado' };

router.get('/pedidos', (req, res) => {
  const orders = db
    .get()
    .prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 300')
    .all()
    .map((o) => ({ ...o, items: JSON.parse(o.items_json || '[]') }));
  res.render('admin/orders', { orders, statuses: ORDER_STATUS, meta: { title: 'Pedidos' } });
});

router.post('/pedidos/:id/estado', (req, res) => {
  if (ORDER_STATUS[req.body.status]) {
    db.get().prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, req.params.id);
    req.flash('ok', 'Estado del pedido actualizado.');
  }
  res.redirect('/admin/pedidos');
});

router.post('/pedidos/:id/eliminar', (req, res) => {
  db.get().prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  req.flash('ok', 'Pedido eliminado.');
  res.redirect('/admin/pedidos');
});

// ---------------------------------------------------------------- Respaldo y datos
router.get('/respaldo', (req, res) => {
  res.render('admin/backup', { demoCount: seed.demoCount(), dataDir: config.DATA_DIR, meta: { title: 'Respaldo y datos' } });
});

router.get('/respaldo/exportar.json', (req, res) => {
  const d = db.get();
  const data = {
    exported_at: new Date().toISOString(),
    settings: Object.fromEntries(d.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value])),
    categories: d.prepare('SELECT * FROM categories ORDER BY sort_order').all(),
    products: d.prepare('SELECT * FROM products ORDER BY id').all(),
    product_categories: d.prepare('SELECT * FROM product_categories').all(),
    product_images: d.prepare('SELECT * FROM product_images ORDER BY product_id, sort_order').all(),
    promotions: d.prepare('SELECT * FROM promotions').all(),
    orders: d.prepare('SELECT * FROM orders ORDER BY id').all(),
  };
  res.attachment(`smarthome-vpar-respaldo-${h.todayISO()}.json`);
  res.type('application/json').send(JSON.stringify(data, null, 2));
});

router.get('/respaldo/productos.csv', (req, res) => {
  const rows = catalog.searchProducts({ includeInactive: true, limit: 200, sort: 'nombre' }).items;
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['ID', 'Nombre', 'Marca', 'Modelo', 'Categorías', 'Precio', 'Precio promocional', 'Precio vigente', 'Existencias', 'Disponibilidad', 'Activo', 'Destacado', 'URL'];
  const lines = rows.map((p) =>
    [p.id, p.name, p.brand, p.model, p.categories.map((c) => c.name).join(' | '), p.price, p.promo_price ?? '', p.pricing.current, p.stock ?? '', p.avail.label, p.active ? 'Sí' : 'No', p.featured ? 'Sí' : 'No', `${res.locals.origin}/producto/${p.slug}`]
      .map(esc)
      .join(';')
  );
  res.attachment(`productos-${h.todayISO()}.csv`);
  // BOM para que Excel reconozca los acentos.
  res.type('text/csv').send('﻿' + [header.join(';'), ...lines].join('\r\n'));
});

router.get('/respaldo/base-datos', (req, res, next) => {
  const tmp = path.join(config.DATA_DIR, `respaldo-${Date.now()}.db`);
  try {
    db.get().exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
  } catch (e) {
    return next(e);
  }
  res.download(tmp, `smarthome-vpar-${h.todayISO()}.db`, () => fs.rm(tmp, { force: true }, () => {}));
});

router.post('/respaldo/eliminar-demo', (req, res) => {
  seed.removeDemo();
  req.flash('ok', 'Datos de demostración eliminados. Tus categorías se conservaron para que las edites.');
  res.redirect('/admin/respaldo');
});

// ---------------------------------------------------------------- Cuenta
router.get('/cuenta', (req, res) => {
  res.render('admin/account', {
    admins: db.get().prepare('SELECT id, username, created_at FROM admins ORDER BY id').all(),
    meta: { title: 'Mi cuenta' },
  });
});

router.post('/cuenta/clave', (req, res) => {
  const admin = db.get().prepare('SELECT * FROM admins WHERE id = ?').get(req.admin.id);
  if (!auth.verifyPassword(String(req.body.current || ''), admin.password_hash)) {
    req.flash('error', 'La contraseña actual no es correcta.');
    return res.redirect('/admin/cuenta');
  }
  if (req.body.password !== req.body.password2) {
    req.flash('error', 'Las contraseñas nuevas no coinciden.');
    return res.redirect('/admin/cuenta');
  }
  try {
    auth.changePassword(admin.id, req.body.password);
  } catch (e) {
    req.flash('error', e.message);
    return res.redirect('/admin/cuenta');
  }
  auth.createSession(res, admin.id);
  req.flash('ok', 'Contraseña actualizada. Se cerraron las sesiones en otros dispositivos.');
  res.redirect('/admin/cuenta');
});

router.post('/cuenta/usuarios', (req, res) => {
  try {
    auth.createAdmin(req.body.username, req.body.password);
    req.flash('ok', 'Nuevo administrador creado.');
  } catch (e) {
    req.flash('error', /UNIQUE/.test(e.message) ? 'Ese nombre de usuario ya existe.' : e.message);
  }
  res.redirect('/admin/cuenta');
});

router.post('/cuenta/usuarios/:id/eliminar', (req, res) => {
  if (Number(req.params.id) === req.admin.id) {
    req.flash('error', 'No puedes eliminar tu propia cuenta mientras la usas.');
  } else {
    db.get().prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
    req.flash('ok', 'Administrador eliminado.');
  }
  res.redirect('/admin/cuenta');
});

router.use((req, res) => {
  res.status(404).render('admin/notfound', { meta: { title: 'No encontrado' } });
});

module.exports = router;
