'use strict';
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const config = require('./config');

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id       INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT DEFAULT '',
  image           TEXT DEFAULT '',
  icon            TEXT DEFAULT 'home',
  sort_order      INTEGER DEFAULT 0,
  active          INTEGER DEFAULT 1,
  seo_title       TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  is_demo         INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  brand             TEXT DEFAULT '',
  model             TEXT DEFAULT '',
  short_description TEXT DEFAULT '',
  description       TEXT DEFAULT '',
  specs             TEXT DEFAULT '',
  connectivity      TEXT DEFAULT '',
  compatibility     TEXT DEFAULT '',
  box_contents      TEXT DEFAULT '',
  keywords          TEXT DEFAULT '',
  price             INTEGER NOT NULL DEFAULT 0,
  promo_price       INTEGER,
  promo_starts      TEXT,
  promo_ends        TEXT,
  stock             INTEGER,
  availability      TEXT DEFAULT 'disponible',
  featured          INTEGER DEFAULT 0,
  is_new            INTEGER DEFAULT 0,
  is_offer          INTEGER DEFAULT 0,
  active            INTEGER DEFAULT 1,
  sort_order        INTEGER DEFAULT 0,
  seo_title         TEXT DEFAULT '',
  seo_description   TEXT DEFAULT '',
  search_text       TEXT DEFAULT '',
  is_demo           INTEGER DEFAULT 0,
  created_at        TEXT DEFAULT (datetime('now')),
  updated_at        TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  position    INTEGER DEFAULT 0,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  path       TEXT NOT NULL,
  alt        TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS promotions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  subtitle    TEXT DEFAULT '',
  image       TEXT DEFAULT '',
  button_text TEXT DEFAULT '',
  link_url    TEXT DEFAULT '',
  starts_at   TEXT,
  ends_at     TEXT,
  active      INTEGER DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  is_demo     INTEGER DEFAULT 0,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT NOT NULL UNIQUE,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_city  TEXT DEFAULT '',
  notes          TEXT DEFAULT '',
  items_json     TEXT NOT NULL,
  total          INTEGER NOT NULL,
  status         TEXT DEFAULT 'nuevo',
  created_at     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id   INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  csrf       TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_pc_category ON product_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_images_product ON product_images(product_id, sort_order);
`;

let db;

function open(file = config.DB_FILE) {
  fs.mkdirSync(config.DATA_DIR, { recursive: true });
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
  db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

function get() {
  if (!db) open();
  return db;
}

// Ejecuta fn dentro de una transacción.
function tx(fn) {
  const d = get();
  d.exec('BEGIN');
  try {
    const r = fn(d);
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

function close() {
  if (db) db.close();
  db = undefined;
}

module.exports = { open, get, tx, close };
