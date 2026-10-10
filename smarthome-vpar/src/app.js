'use strict';
const path = require('node:path');
const express = require('express');
const config = require('./config');
const db = require('./db');
const auth = require('./auth');
const settings = require('./settings');
const catalog = require('./catalog');
const helpers = require('./helpers');
const { icon } = require('./icons');

function createApp() {
  db.open();
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(config.ROOT, 'views'));
  app.disable('x-powered-by');
  if (config.TRUST_PROXY) app.set('trust proxy', 1);

  // Cabeceras de seguridad.
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self'",
        "frame-ancestors 'self'",
        "form-action 'self' https://wa.me https://api.whatsapp.com",
        "base-uri 'self'",
        "object-src 'none'",
      ].join('; '),
    });
    if (config.COOKIE_SECURE) res.set('Strict-Transport-Security', 'max-age=15552000');
    next();
  });

  app.use(express.static(path.join(config.ROOT, 'public'), { maxAge: '7d' }));
  app.use(
    '/uploads',
    express.static(config.UPLOAD_DIR, {
      maxAge: '365d',
      immutable: true,
      setHeaders: (res) => res.set('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"),
    })
  );
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  app.use(express.json({ limit: '200kb' }));
  app.use(auth.loadSession);

  // Variables comunes para todas las vistas.
  app.use((req, res, next) => {
    const s = settings.all();
    const origin = (s.site_url || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    res.locals.s = s;
    res.locals.h = helpers;
    res.locals.icon = icon;
    res.locals.origin = origin;
    res.locals.path = req.path;
    res.locals.cartEnabled = s.cart_enabled === '1';
    res.locals.waConfigured = !!helpers.onlyDigits(s.whatsapp_number);
    res.locals.waGeneral = helpers.whatsappLink(s.whatsapp_number, s.whatsapp_general_message);
    res.locals.flash = null;
    res.locals.meta = {};
    // Mensaje de WhatsApp para un producto concreto.
    res.locals.waProduct = (p) => {
      const price = helpers.formatCOP(p.pricing.current);
      const link = `${origin}/producto/${p.slug}`;
      let msg = helpers.fillTemplate(s.whatsapp_message, { producto: p.name, precio: price, enlace: link });
      if (!s.whatsapp_message.includes('{enlace}')) msg += `\n${link}`;
      return helpers.whatsappLink(s.whatsapp_number, msg);
    };
    next();
  });

  // Menú de categorías (solo en páginas públicas).
  app.use((req, res, next) => {
    if (!req.path.startsWith('/admin')) res.locals.navCategories = catalog.categoryTree();
    next();
  });

  app.use('/admin', require('./routes/admin'));
  app.use('/', require('./routes/public'));

  app.use((req, res) => {
    res.status(404).render('404', { meta: { title: 'Página no encontrada', noindex: true } });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { meta: { title: 'Error', noindex: true }, message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
  });

  return app;
}

module.exports = { createApp };
