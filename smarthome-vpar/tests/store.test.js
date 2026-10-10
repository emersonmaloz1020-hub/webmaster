'use strict';
// Pruebas de funcionamiento de las funciones principales (criterios de aceptación).
// Ejecutar con: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'shv-test-'));
process.env.DATA_DIR = DATA_DIR;
process.env.SEED_DEMO = '1';

const { createApp } = require('../src/app');
const auth = require('../src/auth');
const seed = require('../src/seed');
const db = require('../src/db');

let server;
let base;
const jar = {};

// PNG real de 1x1 píxel (y otro distinto) para probar la carga de imágenes.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

async function req(method, url, { body, form, headers = {}, redirect = 'manual' } = {}) {
  const h = { ...headers };
  if (jar.cookie) h.cookie = jar.cookie;
  let payload;
  if (form) {
    payload = form;
  } else if (body && typeof body === 'object') {
    payload = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) {
      for (const val of Array.isArray(v) ? v : [v]) payload.append(k, String(val));
    }
  }
  const res = await fetch(base + url, { method, headers: h, body: payload, redirect });
  const set = res.headers.getSetCookie();
  for (const c of set) {
    const [pair] = c.split(';');
    const [name, value] = pair.split('=');
    if (name === 'shv_session') jar.session = value ? `shv_session=${value}` : '';
  }
  jar.cookie = jar.session || '';
  return res;
}

async function csrf(url = '/admin') {
  const html = await (await req('GET', url)).text();
  const m = html.match(/name="_csrf" value="([^"]+)"/);
  assert.ok(m, 'la página debe incluir el token CSRF');
  return m[1];
}

before(async () => {
  const app = createApp();
  seed.seedDemo();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('la página de inicio carga con sus secciones y datos de ejemplo identificados', async () => {
  const res = await req('GET', '/');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /SmartHome_Vpar/);
  assert.match(html, /Explorar productos/);
  assert.match(html, /Cámaras Wi-Fi para interiores/);
  assert.match(html, /Productos destacados/);
  assert.match(html, /badge-demo/);
  // Sin número configurado no deben aparecer botones de WhatsApp decorativos.
  assert.doesNotMatch(html, /wa\.me/);
});

test('los visitantes no pueden acceder a funciones administrativas', async () => {
  const r1 = await req('GET', '/admin/productos');
  assert.equal(r1.status, 302);
  assert.match(r1.headers.get('location'), /\/admin\/login|\/admin\/setup/);
  const r2 = await req('POST', '/admin/productos', { body: { name: 'Hack', price: '1000' } });
  assert.equal(r2.status, 401);
  const r3 = await req('POST', '/admin/configuracion', { body: { whatsapp_number: '573000000000' } });
  assert.equal(r3.status, 401);
});

test('configuración inicial exige el código y permite iniciar sesión', async () => {
  let r = await req('POST', '/admin/setup', { body: { code: 'MALO', username: 'admin', password: 'ClaveSegura123', password2: 'ClaveSegura123' } });
  assert.equal(r.status, 400);
  r = await req('POST', '/admin/setup', {
    body: { code: auth.getSetupCode(), username: 'admin', password: 'ClaveSegura123', password2: 'ClaveSegura123' },
  });
  assert.equal(r.status, 302);
  // La configuración inicial ya no está disponible.
  r = await req('GET', '/admin/setup');
  assert.equal(r.status, 302);
  // Cerrar sesión y volver a entrar con usuario y contraseña.
  const token = await csrf();
  r = await req('POST', '/admin/logout', { body: { _csrf: token } });
  assert.equal(r.status, 302);
  r = await req('POST', '/admin/login', { body: { username: 'admin', password: 'incorrecta' } });
  assert.equal(r.status, 401);
  r = await req('POST', '/admin/login', { body: { username: 'admin', password: 'ClaveSegura123' } });
  assert.equal(r.status, 302);
  r = await req('GET', '/admin');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Pendientes de configuración/);
});

test('las peticiones sin token CSRF son rechazadas', async () => {
  const r = await req('POST', '/admin/configuracion', { body: { whatsapp_number: '573000000000' } });
  assert.equal(r.status, 403);
});

let categoryId;
test('se crea una categoría y se muestra en la tienda', async () => {
  const token = await csrf('/admin/categorias/nueva');
  const form = new FormData();
  form.append('_csrf', token);
  form.append('name', 'Cerraduras inteligentes');
  form.append('description', 'Cerraduras con huella y Wi-Fi');
  form.append('icon', 'lock');
  form.append('active', '1');
  form.append('sort_order', '5');
  form.append('image', new Blob([PNG], { type: 'image/png' }), 'portada.png');
  const r = await req('POST', '/admin/categorias', { form });
  assert.equal(r.status, 302);
  categoryId = Number(r.headers.get('location').split('/').pop());
  assert.ok(categoryId > 0);
  const home = await (await req('GET', '/')).text();
  assert.match(home, /Cerraduras inteligentes/);
  const page = await req('GET', '/categoria/cerraduras-inteligentes');
  assert.equal(page.status, 200);
});

let productId;
test('se crea un producto con fotografías y aparece en su categoría', async () => {
  const token = await csrf('/admin/productos/nuevo');
  const form = new FormData();
  form.append('_csrf', token);
  form.append('name', 'Cerradura Wi-Fi con huella');
  form.append('brand', 'Marca Prueba');
  form.append('price', '$ 459.900');
  form.append('description', 'Abre tu puerta con huella, clave o desde el celular.');
  form.append('specs', 'Huellas: hasta 100\nBatería: 4 AA');
  form.append('connectivity', 'Wi-Fi, Bluetooth');
  form.append('compatibility', 'Alexa');
  form.append('stock', '7');
  form.append('availability', 'disponible');
  form.append('active', '1');
  form.append('category_ids', String(categoryId));
  form.append('images', new Blob([JPG], { type: 'image/jpeg' }), 'foto-celular.jpg');
  form.append('images', new Blob([PNG], { type: 'image/png' }), 'foto2.png');
  const r = await req('POST', '/admin/productos', { form });
  assert.equal(r.status, 302);
  productId = Number(r.headers.get('location').split('/').pop());
  const html = await (await req('GET', '/categoria/cerraduras-inteligentes')).text();
  assert.match(html, /Cerradura Wi-Fi con huella/);
  assert.match(html, /\$ 459\.900/);
  const p = db.get().prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order').all(productId);
  assert.equal(p.length, 2);
  for (const img of p) assert.ok(fs.existsSync(path.join(DATA_DIR, 'uploads', path.basename(img.path))), 'la imagen debe guardarse en disco');
});

test('archivos que no son imágenes se rechazan', async () => {
  const token = await csrf(`/admin/productos/${productId}`);
  const form = new FormData();
  form.append('_csrf', token);
  form.append('name', 'Cerradura Wi-Fi con huella');
  form.append('brand', 'Marca Prueba');
  form.append('connectivity', 'Wi-Fi, Bluetooth');
  form.append('price', '459900');
  form.append('active', '1');
  form.append('category_ids', String(categoryId));
  form.append('images', new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'falso.png');
  const r = await req('POST', `/admin/productos/${productId}`, { form });
  assert.equal(r.status, 302);
  const n = db.get().prepare('SELECT COUNT(*) AS n FROM product_images WHERE product_id = ?').get(productId).n;
  assert.equal(n, 2);
});

test('la búsqueda encuentra productos por nombre, categoría y palabra clave (sin tildes)', async () => {
  for (const q of ['cerradura', 'huella', 'CERRADURAS INTELIGENTES', 'camara']) {
    const html = await (await req('GET', `/catalogo?q=${encodeURIComponent(q)}`)).text();
    assert.doesNotMatch(html, /No encontramos productos/, `debe haber resultados para "${q}"`);
  }
  const none = await (await req('GET', '/catalogo?q=zzzzzz')).text();
  assert.match(none, /No encontramos productos/);
});

test('los filtros por marca, precio y conectividad funcionan', async () => {
  const html = await (await req('GET', '/catalogo?marca=Marca+Prueba')).text();
  assert.match(html, /Cerradura Wi-Fi con huella/);
  assert.match(html, /<strong>1<\/strong> producto/);
  const cheap = await (await req('GET', '/catalogo?max=50000')).text();
  assert.doesNotMatch(cheap, /Cerradura Wi-Fi con huella/);
  const bt = await (await req('GET', '/catalogo?conectividad=Bluetooth')).text();
  assert.match(bt, /Cerradura Wi-Fi con huella/);
});

test('se editan precios y promociones y la ficha se actualiza', async () => {
  const token = await csrf(`/admin/productos/${productId}`);
  const r = await req('POST', `/admin/productos/${productId}`, {
    body: {
      _csrf: token, name: 'Cerradura Wi-Fi con huella', price: '499900', promo_price: '429900', promo_ends: '2099-12-31',
      active: '1', featured: '1', category_ids: String(categoryId), connectivity: 'Wi-Fi, Bluetooth', availability: 'disponible', stock: '7',
    },
  });
  assert.equal(r.status, 302);
  const html = await (await req('GET', '/producto/cerradura-wi-fi-con-huella')).text();
  assert.match(html, /\$ 429\.900/);
  assert.match(html, /<s class="price-old">\$ 499\.900<\/s>/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"priceCurrency":"COP"/);
  // Aparece en destacados y en ofertas.
  assert.match(await (await req('GET', '/')).text(), /Cerradura Wi-Fi con huella/);
  assert.match(await (await req('GET', '/ofertas')).text(), /Cerradura Wi-Fi con huella/);
  // Promoción vencida → precio normal.
  const token2 = await csrf(`/admin/productos/${productId}`);
  await req('POST', `/admin/productos/${productId}`, {
    body: { _csrf: token2, name: 'Cerradura Wi-Fi con huella', price: '499900', promo_price: '429900', promo_ends: '2020-01-01', active: '1', category_ids: String(categoryId) },
  });
  const html2 = await (await req('GET', '/producto/cerradura-wi-fi-con-huella')).text();
  assert.match(html2, /class="price">\$ 499\.900/);
});

test('la validación rechaza datos incorrectos', async () => {
  const token = await csrf('/admin/productos/nuevo');
  const r = await req('POST', '/admin/productos', { body: { _csrf: token, name: '', price: 'abc', promo_price: '10', stock: '-3' } });
  assert.equal(r.status, 400);
  const html = await r.text();
  assert.match(html, /Escribe el nombre del producto/);
  assert.match(html, /precio de venta válido/);
});

test('el botón de WhatsApp genera el mensaje con producto, precio y enlace', async () => {
  const token = await csrf('/admin/configuracion');
  const r = await req('POST', '/admin/configuracion', { body: { _csrf: token, whatsapp_number: '+57 300 123 4567', site_url: 'https://tienda.ejemplo.co' } });
  assert.equal(r.status, 302);
  const html = await (await req('GET', '/producto/cerradura-wi-fi-con-huella')).text();
  const m = html.match(/href="(https:\/\/wa\.me\/[^"]+)"/g);
  assert.ok(m && m.length, 'debe existir un enlace de WhatsApp');
  const link = m.map((x) => x.slice(6, -1).replace(/&amp;/g, '&')).find((l) => l.includes('Cerradura'));
  const url = new URL(link);
  assert.equal(url.pathname, '/573001234567');
  const text = url.searchParams.get('text');
  assert.equal(
    text,
    'Hola, SmartHome_Vpar. Estoy interesado en el producto Cerradura Wi-Fi con huella, publicado por $ 499.900. ¿Me pueden brindar más información sobre su disponibilidad?\nhttps://tienda.ejemplo.co/producto/cerradura-wi-fi-con-huella'
  );
});

test('los cambios de personalización se conservan', async () => {
  const token = await csrf('/admin/apariencia');
  const form = new FormData();
  form.append('_csrf', token);
  form.append('store_name', 'SmartHome_Vpar');
  form.append('color_primary', '#ff0088');
  form.append('color_accent', '#00ffaa');
  form.append('font_heading', 'Poppins');
  form.append('hero_title', 'Tu hogar, más inteligente');
  form.append('benefit_title', 'Beneficio uno');
  form.append('benefit_text', 'Texto');
  form.append('benefit_icon', 'shield');
  form.append('logo', new Blob([PNG], { type: 'image/png' }), 'logo.png');
  const r = await req('POST', '/admin/apariencia', { form });
  assert.equal(r.status, 302);
  const html = await (await req('GET', '/')).text();
  assert.match(html, /--primary:#ff0088/);
  assert.match(html, /family=Poppins/);
  assert.match(html, /Tu hogar, más inteligente/);
  assert.match(html, /Beneficio uno/);
  assert.match(html, /src="\/uploads\/[^"]+\.png" alt="" width="40"/);
  // Colores inválidos se ignoran.
  const t2 = await csrf('/admin/apariencia');
  const f2 = new FormData();
  f2.append('_csrf', t2);
  f2.append('color_primary', 'red;}</style><script>');
  await req('POST', '/admin/apariencia', { form: f2 });
  assert.match(await (await req('GET', '/')).text(), /--primary:#ff0088/);
});

test('las imágenes siguen disponibles después de cerrar sesión', async () => {
  const img = db.get().prepare('SELECT path FROM product_images WHERE product_id = ? LIMIT 1').get(productId);
  const token = await csrf();
  await req('POST', '/admin/logout', { body: { _csrf: token } });
  jar.session = '';
  jar.cookie = '';
  const r = await req('GET', img.path);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /image\//);
  assert.equal((await req('GET', '/admin')).status, 302);
  // Volver a entrar para las siguientes pruebas.
  await req('POST', '/admin/login', { body: { username: 'admin', password: 'ClaveSegura123' } });
});

test('desactivar un producto lo oculta sin perder su información', async () => {
  const token = await csrf('/admin/productos');
  await req('POST', `/admin/productos/${productId}/estado`, { body: { _csrf: token, field: 'active' } });
  const saved = { ...jar };
  jar.cookie = '';
  assert.equal((await req('GET', '/producto/cerradura-wi-fi-con-huella')).status, 404);
  Object.assign(jar, saved);
  const row = db.get().prepare('SELECT name, price FROM products WHERE id = ?').get(productId);
  assert.equal(row.name, 'Cerradura Wi-Fi con huella');
  const t2 = await csrf('/admin/productos');
  await req('POST', `/admin/productos/${productId}/estado`, { body: { _csrf: t2, field: 'active' } });
});

test('carrito: el pedido recalcula precios en el servidor y genera mensaje', async () => {
  const token = await csrf('/admin/configuracion');
  await req('POST', '/admin/configuracion', { body: { _csrf: token, whatsapp_number: '573001234567', cart_enabled: '1' } });
  const r = await fetch(`${base}/api/pedidos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Cliente Prueba', phone: '3001112233', city: 'Bogotá', items: [{ id: productId, qty: 2, price: 1 }] }),
  });
  assert.equal(r.status, 200);
  const d = await r.json();
  assert.equal(d.total, 999800);
  assert.match(decodeURIComponent(d.whatsapp), /2 x Cerradura Wi-Fi con huella/);
  const html = await (await req('GET', '/admin/pedidos')).text();
  assert.match(html, /Cliente Prueba/);
});

test('se elimina un producto y sus fotografías', async () => {
  const imgs = db.get().prepare('SELECT path FROM product_images WHERE product_id = ?').all(productId);
  const token = await csrf(`/admin/productos/${productId}`);
  const r = await req('POST', `/admin/productos/${productId}/eliminar`, { body: { _csrf: token } });
  assert.equal(r.status, 302);
  assert.equal(db.get().prepare('SELECT COUNT(*) AS n FROM products WHERE id = ?').get(productId).n, 0);
  await new Promise((res) => setTimeout(res, 100));
  for (const i of imgs) assert.equal(fs.existsSync(path.join(DATA_DIR, 'uploads', path.basename(i.path))), false);
});

test('se elimina una categoría sin borrar productos', async () => {
  const before = db.get().prepare('SELECT COUNT(*) AS n FROM products').get().n;
  const token = await csrf('/admin/categorias');
  await req('POST', `/admin/categorias/${categoryId}/eliminar`, { body: { _csrf: token } });
  assert.equal((await req('GET', '/categoria/cerraduras-inteligentes')).status, 404);
  assert.equal(db.get().prepare('SELECT COUNT(*) AS n FROM products').get().n, before);
});

test('exportaciones y SEO', async () => {
  const json = await req('GET', '/admin/respaldo/exportar.json');
  assert.equal(json.status, 200);
  const data = await json.json();
  assert.ok(data.products.length > 0);
  const csv = await req('GET', '/admin/respaldo/productos.csv');
  assert.match(await csv.text(), /Nombre;Marca/);
  const dbFile = await req('GET', '/admin/respaldo/base-datos');
  assert.equal(dbFile.status, 200);
  assert.equal(Buffer.from(await dbFile.arrayBuffer()).subarray(0, 15).toString(), 'SQLite format 3');
  const sitemap = await (await req('GET', '/sitemap.xml')).text();
  assert.match(sitemap, /https:\/\/tienda\.ejemplo\.co\/producto\//);
  assert.match(await (await req('GET', '/robots.txt')).text(), /Disallow: \/admin/);
});

test('eliminar datos de demostración', async () => {
  const token = await csrf('/admin/respaldo');
  await req('POST', '/admin/respaldo/eliminar-demo', { body: { _csrf: token } });
  assert.equal(seed.demoCount(), 0);
  assert.ok(db.get().prepare('SELECT COUNT(*) AS n FROM categories').get().n >= 8);
});
