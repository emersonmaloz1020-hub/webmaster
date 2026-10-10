'use strict';
const db = require('./db');
const { slugify, normalizeText, priceInfo, availabilityOf, splitList, todayISO } = require('./helpers');

// ---------------------------------------------------------------- Categorías

function listCategories({ includeHidden = false } = {}) {
  const rows = db
    .get()
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM product_categories pc JOIN products p ON p.id = pc.product_id
          WHERE pc.category_id = c.id AND p.active = 1) AS product_count
       FROM categories c
       ${includeHidden ? '' : 'WHERE c.active = 1'}
       ORDER BY c.sort_order, c.name`
    )
    .all();
  return rows;
}

// Árbol: categorías principales con sus subcategorías.
function categoryTree(opts) {
  const all = listCategories(opts);
  const ids = new Set(all.map((c) => c.id));
  const roots = all.filter((c) => !c.parent_id || !ids.has(c.parent_id));
  for (const r of roots) r.children = all.filter((c) => c.parent_id === r.id);
  return roots;
}

function getCategory(id) {
  return db.get().prepare('SELECT * FROM categories WHERE id = ?').get(id);
}

function getCategoryBySlug(slug) {
  return db.get().prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
}

function uniqueSlug(table, base, excludeId) {
  let slug = slugify(base);
  let i = 2;
  const stmt = db.get().prepare(`SELECT id FROM ${table} WHERE slug = ? AND id IS NOT ?`);
  while (stmt.get(slug, excludeId ?? null)) slug = `${slugify(base)}-${i++}`;
  return slug;
}

function saveCategory(data, id) {
  const d = db.get();
  const fields = {
    name: data.name,
    slug: uniqueSlug('categories', data.slug || data.name, id),
    parent_id: data.parent_id || null,
    description: data.description || '',
    icon: data.icon || 'home',
    sort_order: Number(data.sort_order) || 0,
    active: data.active ? 1 : 0,
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
  };
  if (data.image !== undefined) fields.image = data.image;
  if (data.is_demo !== undefined) fields.is_demo = data.is_demo ? 1 : 0;
  if (id && Number(fields.parent_id) === Number(id)) fields.parent_id = null;

  const keys = Object.keys(fields);
  if (id) {
    d.prepare(`UPDATE categories SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(
      ...keys.map((k) => fields[k]),
      id
    );
    return Number(id);
  }
  const r = d
    .prepare(`INSERT INTO categories (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
    .run(...keys.map((k) => fields[k]));
  return Number(r.lastInsertRowid);
}

function deleteCategory(id) {
  db.tx((d) => {
    d.prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = ?').run(id);
    d.prepare('DELETE FROM categories WHERE id = ?').run(id);
  });
}

function moveCategory(id, direction) {
  const list = listCategories({ includeHidden: true });
  const idx = list.findIndex((c) => c.id === Number(id));
  const swap = idx + (direction === 'up' ? -1 : 1);
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  [list[idx], list[swap]] = [list[swap], list[idx]];
  const stmt = db.get().prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  db.tx(() => list.forEach((c, i) => stmt.run((i + 1) * 10, c.id)));
}

// ---------------------------------------------------------------- Productos

function decorate(p) {
  if (!p) return p;
  const images = db
    .get()
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id')
    .all(p.id);
  const categories = db
    .get()
    .prepare(
      `SELECT c.* FROM categories c JOIN product_categories pc ON pc.category_id = c.id
       WHERE pc.product_id = ? ORDER BY pc.position, c.sort_order`
    )
    .all(p.id);
  return {
    ...p,
    images,
    image: images[0] || null,
    categories,
    category: categories[0] || null,
    pricing: priceInfo(p),
    avail: availabilityOf(p),
    connectivityList: splitList(p.connectivity),
    compatibilityList: splitList(p.compatibility),
  };
}

function getProduct(id) {
  return decorate(db.get().prepare('SELECT * FROM products WHERE id = ?').get(id));
}

function getProductBySlug(slug) {
  return decorate(db.get().prepare('SELECT * FROM products WHERE slug = ?').get(slug));
}

const SORTS = {
  relevancia: 'p.featured DESC, p.sort_order, p.created_at DESC',
  recientes: 'p.created_at DESC, p.id DESC',
  'precio-asc': 'effective_price ASC',
  'precio-desc': 'effective_price DESC',
  nombre: 'p.name COLLATE NOCASE ASC',
};

// Búsqueda y filtros del catálogo público y del panel.
function searchProducts(f = {}) {
  const where = [];
  const params = [];
  const today = todayISO();
  if (!f.includeInactive) where.push('p.active = 1');
  if (f.q) {
    const words = normalizeText(f.q).split(/\s+/).filter(Boolean).slice(0, 6);
    for (const w of words) {
      where.push('p.search_text LIKE ?');
      params.push(`%${w}%`);
    }
  }
  if (f.categoryIds && f.categoryIds.length) {
    where.push(
      `p.id IN (SELECT product_id FROM product_categories WHERE category_id IN (${f.categoryIds.map(() => '?').join(',')}))`
    );
    params.push(...f.categoryIds);
  }
  if (f.brands && f.brands.length) {
    where.push(`p.brand IN (${f.brands.map(() => '?').join(',')})`);
    params.push(...f.brands);
  }
  for (const c of f.connectivity || []) {
    where.push("(',' || REPLACE(LOWER(p.connectivity), ', ', ',') || ',') LIKE ?");
    params.push(`%,${c.toLowerCase()},%`);
  }
  for (const c of f.compatibility || []) {
    where.push("(',' || REPLACE(LOWER(p.compatibility), ', ', ',') || ',') LIKE ?");
    params.push(`%,${c.toLowerCase()},%`);
  }
  if (f.featured) where.push('p.featured = 1');
  if (f.inStock) where.push("p.availability != 'agotado' AND (p.stock IS NULL OR p.stock > 0 OR p.availability = 'pedido')");
  const promoActive = `(p.promo_price IS NOT NULL AND p.promo_price > 0 AND p.promo_price < p.price
      AND (p.promo_starts IS NULL OR p.promo_starts = '' OR p.promo_starts <= '${today}')
      AND (p.promo_ends IS NULL OR p.promo_ends = '' OR p.promo_ends >= '${today}'))`;
  if (f.offers) where.push(`(${promoActive} OR p.is_offer = 1)`);
  const effective = `CASE WHEN ${promoActive} THEN p.promo_price ELSE p.price END`;
  if (f.min) {
    where.push(`${effective} >= ?`);
    params.push(Number(f.min));
  }
  if (f.max) {
    where.push(`${effective} <= ?`);
    params.push(Number(f.max));
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = SORTS[f.sort] || SORTS.relevancia;
  const d = db.get();
  const total = d.prepare(`SELECT COUNT(*) AS n FROM products p ${whereSql}`).get(...params).n;
  const limit = Math.min(Number(f.limit) || 24, 200);
  const page = Math.max(1, Number(f.page) || 1);
  const rows = d
    .prepare(
      `SELECT p.*, ${effective} AS effective_price FROM products p ${whereSql}
       ORDER BY ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, limit, (page - 1) * limit);
  return { items: rows.map(decorate), total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

function facets() {
  const d = db.get();
  const brands = d
    .prepare("SELECT DISTINCT brand FROM products WHERE active = 1 AND brand != '' ORDER BY brand COLLATE NOCASE")
    .all()
    .map((r) => r.brand);
  const conn = new Map();
  const compat = new Map();
  for (const r of d.prepare('SELECT connectivity, compatibility FROM products WHERE active = 1').all()) {
    for (const c of splitList(r.connectivity)) conn.set(c.toLowerCase(), c);
    for (const c of splitList(r.compatibility)) compat.set(c.toLowerCase(), c);
  }
  const prices = d.prepare('SELECT MIN(price) AS min, MAX(price) AS max FROM products WHERE active = 1').get();
  return {
    brands,
    connectivity: [...conn.values()].sort((a, b) => a.localeCompare(b, 'es')),
    compatibility: [...compat.values()].sort((a, b) => a.localeCompare(b, 'es')),
    prices,
  };
}

function buildSearchText(p, categoryNames) {
  return normalizeText(
    [p.name, p.brand, p.model, p.short_description, p.description, p.keywords, p.connectivity, p.compatibility, ...categoryNames].join(' ')
  );
}

function saveProduct(data, id) {
  const d = db.get();
  const categoryIds = [...new Set((data.category_ids || []).map(Number).filter(Boolean))];
  const fields = {
    name: data.name,
    slug: uniqueSlug('products', data.slug || data.name, id),
    brand: data.brand || '',
    model: data.model || '',
    short_description: data.short_description || '',
    description: data.description || '',
    specs: data.specs || '',
    connectivity: splitList(data.connectivity).join(', '),
    compatibility: splitList(data.compatibility).join(', '),
    box_contents: data.box_contents || '',
    keywords: data.keywords || '',
    price: data.price ?? 0,
    promo_price: data.promo_price ?? null,
    promo_starts: data.promo_starts || null,
    promo_ends: data.promo_ends || null,
    stock: data.stock ?? null,
    availability: data.availability || 'disponible',
    featured: data.featured ? 1 : 0,
    is_new: data.is_new ? 1 : 0,
    is_offer: data.is_offer ? 1 : 0,
    active: data.active ? 1 : 0,
    sort_order: Number(data.sort_order) || 0,
    seo_title: data.seo_title || '',
    seo_description: data.seo_description || '',
  };
  if (data.is_demo !== undefined) fields.is_demo = data.is_demo ? 1 : 0;
  const catNames = categoryIds.map((cid) => getCategory(cid)?.name || '');
  fields.search_text = buildSearchText(fields, catNames);

  return db.tx(() => {
    const keys = Object.keys(fields);
    let pid = id ? Number(id) : null;
    if (pid) {
      d.prepare(
        `UPDATE products SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
      ).run(...keys.map((k) => fields[k]), pid);
    } else {
      const r = d
        .prepare(`INSERT INTO products (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
        .run(...keys.map((k) => fields[k]));
      pid = Number(r.lastInsertRowid);
    }
    d.prepare('DELETE FROM product_categories WHERE product_id = ?').run(pid);
    const ins = d.prepare('INSERT INTO product_categories (product_id, category_id, position) VALUES (?, ?, ?)');
    categoryIds.forEach((cid, i) => {
      if (getCategory(cid)) ins.run(pid, cid, i);
    });
    return pid;
  });
}

function setProductFlag(id, field, value) {
  if (!['active', 'featured', 'is_new', 'is_offer'].includes(field)) throw new Error('Campo no permitido');
  db.get().prepare(`UPDATE products SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(value ? 1 : 0, id);
}

function deleteProduct(id) {
  const images = db.get().prepare('SELECT path FROM product_images WHERE product_id = ?').all(id);
  db.get().prepare('DELETE FROM products WHERE id = ?').run(id);
  return images.map((i) => i.path);
}

function addImage(productId, path, alt) {
  const max = db.get().prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM product_images WHERE product_id = ?').get(productId).m;
  db.get()
    .prepare('INSERT INTO product_images (product_id, path, alt, sort_order) VALUES (?, ?, ?, ?)')
    .run(productId, path, alt || '', max + 1);
}

function getImage(id) {
  return db.get().prepare('SELECT * FROM product_images WHERE id = ?').get(id);
}

function updateImageAlt(id, alt) {
  db.get().prepare('UPDATE product_images SET alt = ? WHERE id = ?').run(alt || '', id);
}

function deleteImage(id) {
  db.get().prepare('DELETE FROM product_images WHERE id = ?').run(id);
}

// Reordena imágenes: "main" la pone primera, "up"/"down" la mueve una posición.
function moveImage(id, action) {
  const img = getImage(id);
  if (!img) return;
  const list = db
    .get()
    .prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id')
    .all(img.product_id);
  const idx = list.findIndex((i) => i.id === img.id);
  if (action === 'main') {
    list.splice(idx, 1);
    list.unshift(img);
  } else {
    const swap = idx + (action === 'up' ? -1 : 1);
    if (swap < 0 || swap >= list.length) return;
    [list[idx], list[swap]] = [list[swap], list[idx]];
  }
  const stmt = db.get().prepare('UPDATE product_images SET sort_order = ? WHERE id = ?');
  db.tx(() => list.forEach((im, i) => stmt.run(i, im.id)));
}

function relatedProducts(product, limit = 4) {
  const catIds = product.categories.map((c) => c.id);
  let items = [];
  if (catIds.length) {
    items = db
      .get()
      .prepare(
        `SELECT DISTINCT p.* FROM products p JOIN product_categories pc ON pc.product_id = p.id
         WHERE p.active = 1 AND p.id != ? AND pc.category_id IN (${catIds.map(() => '?').join(',')})
         ORDER BY p.featured DESC, p.created_at DESC LIMIT ?`
      )
      .all(product.id, ...catIds, limit);
  }
  if (items.length < limit) {
    const have = new Set([product.id, ...items.map((i) => i.id)]);
    const more = db
      .get()
      .prepare('SELECT * FROM products WHERE active = 1 AND featured = 1 ORDER BY created_at DESC LIMIT ?')
      .all(limit * 2)
      .filter((p) => !have.has(p.id));
    items = items.concat(more).slice(0, limit);
  }
  return items.map(decorate);
}

function getProductsByIds(ids) {
  if (!ids.length) return [];
  return db
    .get()
    .prepare(`SELECT * FROM products WHERE active = 1 AND id IN (${ids.map(() => '?').join(',')})`)
    .all(...ids)
    .map(decorate);
}

// Recalcula el texto de búsqueda (por ejemplo, tras renombrar una categoría).
function reindexAll() {
  const d = db.get();
  const stmt = d.prepare('UPDATE products SET search_text = ? WHERE id = ?');
  for (const p of d.prepare('SELECT * FROM products').all()) {
    const names = d
      .prepare('SELECT c.name FROM categories c JOIN product_categories pc ON pc.category_id = c.id WHERE pc.product_id = ?')
      .all(p.id)
      .map((r) => r.name);
    stmt.run(buildSearchText(p, names), p.id);
  }
}

// ---------------------------------------------------------------- Promociones

function listPromotions({ onlyCurrent = false } = {}) {
  const today = todayISO();
  const rows = db.get().prepare('SELECT * FROM promotions ORDER BY sort_order, id DESC').all();
  if (!onlyCurrent) return rows;
  return rows.filter(
    (r) => r.active && (!r.starts_at || r.starts_at <= today) && (!r.ends_at || r.ends_at >= today)
  );
}

function getPromotion(id) {
  return db.get().prepare('SELECT * FROM promotions WHERE id = ?').get(id);
}

function savePromotion(data, id) {
  const fields = {
    title: data.title,
    subtitle: data.subtitle || '',
    button_text: data.button_text || '',
    link_url: data.link_url || '',
    starts_at: data.starts_at || null,
    ends_at: data.ends_at || null,
    active: data.active ? 1 : 0,
    sort_order: Number(data.sort_order) || 0,
  };
  if (data.image !== undefined) fields.image = data.image;
  if (data.is_demo !== undefined) fields.is_demo = data.is_demo ? 1 : 0;
  const keys = Object.keys(fields);
  if (id) {
    db.get()
      .prepare(`UPDATE promotions SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`)
      .run(...keys.map((k) => fields[k]), id);
    return Number(id);
  }
  const r = db
    .get()
    .prepare(`INSERT INTO promotions (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`)
    .run(...keys.map((k) => fields[k]));
  return Number(r.lastInsertRowid);
}

function deletePromotion(id) {
  db.get().prepare('DELETE FROM promotions WHERE id = ?').run(id);
}

module.exports = {
  listCategories,
  categoryTree,
  getCategory,
  getCategoryBySlug,
  saveCategory,
  deleteCategory,
  moveCategory,
  getProduct,
  getProductBySlug,
  searchProducts,
  facets,
  saveProduct,
  setProductFlag,
  deleteProduct,
  addImage,
  getImage,
  updateImageAlt,
  deleteImage,
  moveImage,
  relatedProducts,
  getProductsByIds,
  reindexAll,
  listPromotions,
  getPromotion,
  savePromotion,
  deletePromotion,
  SORTS,
};
