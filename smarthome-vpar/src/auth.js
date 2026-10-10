'use strict';
const crypto = require('node:crypto');
const db = require('./db');
const config = require('./config');

const COOKIE = 'shv_session';

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(expected, actual);
}

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'La contraseña debe tener al menos 10 caracteres.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'La contraseña debe combinar letras y números.';
  return null;
}

function adminCount() {
  return db.get().prepare('SELECT COUNT(*) AS n FROM admins').get().n;
}

function createAdmin(username, password) {
  const u = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(u)) throw new Error('El usuario debe tener entre 3 y 40 caracteres (letras, números, punto o guion).');
  const err = validatePassword(password);
  if (err) throw new Error(err);
  db.get().prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(u, hashPassword(password));
}

function changePassword(adminId, password) {
  const err = validatePassword(password);
  if (err) throw new Error(err);
  db.get().prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hashPassword(password), adminId);
  // Cierra las demás sesiones abiertas.
  db.get().prepare('DELETE FROM sessions WHERE admin_id = ?').run(adminId);
}

function findAdmin(username) {
  return db.get().prepare('SELECT * FROM admins WHERE username = ?').get(String(username || '').trim().toLowerCase());
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function createSession(res, adminId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const expires = Date.now() + config.SESSION_DAYS * 86400 * 1000;
  db.get().prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
  db.get().prepare('INSERT INTO sessions (token_hash, admin_id, csrf, expires_at) VALUES (?, ?, ?, ?)').run(sha(token), adminId, csrf, expires);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    maxAge: config.SESSION_DAYS * 86400 * 1000,
    path: '/',
  });
}

function destroySession(req, res) {
  const token = readCookie(req, COOKIE);
  if (token) db.get().prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha(token));
  res.clearCookie(COOKIE, { path: '/' });
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

// Middleware: carga la sesión del administrador si existe.
function loadSession(req, res, next) {
  req.admin = null;
  const token = readCookie(req, COOKIE);
  if (token) {
    const s = db
      .get()
      .prepare(
        `SELECT s.csrf, s.expires_at, a.id, a.username FROM sessions s JOIN admins a ON a.id = s.admin_id
         WHERE s.token_hash = ?`
      )
      .get(sha(token));
    if (s && s.expires_at > Date.now()) {
      req.admin = { id: s.id, username: s.username };
      req.csrfToken = s.csrf;
    }
  }
  res.locals.admin = req.admin;
  res.locals.csrfToken = req.csrfToken || '';
  next();
}

function requireAdmin(req, res, next) {
  if (req.admin) return next();
  if (req.method === 'GET') return res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
  return res.status(401).send('No autorizado');
}

// Verifica el token CSRF en toda petición que modifica datos.
function requireCsrf(req, res, next) {
  const sent = (req.body && req.body._csrf) || req.get('x-csrf-token');
  if (req.csrfToken && sent && sent.length === req.csrfToken.length &&
      crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(req.csrfToken))) {
    return next();
  }
  return res.status(403).send('Solicitud no válida (token de seguridad). Recarga la página e inténtalo de nuevo.');
}

// Limitador sencillo de intentos fallidos de inicio de sesión, por IP.
const attempts = new Map();
function tooManyAttempts(ip) {
  const a = attempts.get(ip);
  if (!a) return false;
  if (Date.now() - a.first > 15 * 60 * 1000) {
    attempts.delete(ip);
    return false;
  }
  return a.count >= 5;
}
function registerFailure(ip) {
  const a = attempts.get(ip);
  if (!a || Date.now() - a.first > 15 * 60 * 1000) attempts.set(ip, { first: Date.now(), count: 1 });
  else a.count++;
}
function clearFailures(ip) {
  attempts.delete(ip);
}

// Código de configuración inicial: se imprime en la consola del servidor cuando no existe ningún administrador.
let setupCode = null;
function getSetupCode() {
  if (!setupCode) setupCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  return setupCode;
}
function resetSetupCode() {
  setupCode = null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  validatePassword,
  adminCount,
  createAdmin,
  changePassword,
  findAdmin,
  createSession,
  destroySession,
  loadSession,
  requireAdmin,
  requireCsrf,
  tooManyAttempts,
  registerFailure,
  clearFailures,
  getSetupCode,
  resetSetupCode,
};
