'use strict';
const path = require('node:path');
const fs = require('node:fs');

// Carga opcional de un archivo .env sencillo (CLAVE=valor) sin dependencias externas.
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const value = m[2].replace(/^["']|["']$/g, '');
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
loadDotEnv(path.join(__dirname, '..', '.env'));

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));

module.exports = {
  ROOT,
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, 'store.db'),
  UPLOAD_DIR: path.join(DATA_DIR, 'uploads'),
  PORT: Number(process.env.PORT) || 3000,
  // Detrás de un proxy HTTPS (Render, Railway, Nginx…) activar para cookies seguras.
  TRUST_PROXY: process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production',
  COOKIE_SECURE: process.env.COOKIE_SECURE === '1' || process.env.NODE_ENV === 'production',
  SEED_DEMO: process.env.SEED_DEMO !== '0',
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB) || 10,
  SESSION_DAYS: 7,
};
