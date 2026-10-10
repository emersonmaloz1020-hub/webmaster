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

// Lee una variable "1"/"0"; si no está definida usa el valor por defecto.
function flag(name, fallback) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v === '1';
}

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));

module.exports = {
  ROOT,
  DATA_DIR,
  DB_FILE: path.join(DATA_DIR, 'store.db'),
  UPLOAD_DIR: path.join(DATA_DIR, 'uploads'),
  PORT: Number(process.env.PORT) || 3000,
  // Con un proxy (Caddy/Nginx) delante conviene HOST=127.0.0.1 para no exponer el puerto.
  HOST: process.env.HOST || '0.0.0.0',
  // Detrás de un proxy HTTPS (Render, Railway, Nginx…) activar para cookies seguras.
  TRUST_PROXY: flag('TRUST_PROXY', process.env.NODE_ENV === 'production'),
  COOKIE_SECURE: flag('COOKIE_SECURE', process.env.NODE_ENV === 'production'),
  SEED_DEMO: process.env.SEED_DEMO !== '0',
  MAX_UPLOAD_MB: Number(process.env.MAX_UPLOAD_MB) || 10,
  SESSION_DAYS: 7,
};
