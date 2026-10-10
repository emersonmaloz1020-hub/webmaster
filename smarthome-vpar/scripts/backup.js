'use strict';
// Copia de seguridad completa: base de datos + fotografías → backups/AAAA-MM-DD_HHMM/
// Uso: npm run backup   (opcional: BACKUP_DIR=/ruta npm run backup)
const fs = require('node:fs');
const path = require('node:path');
const config = require('../src/config');
const db = require('../src/db');

const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
const dest = path.resolve(process.env.BACKUP_DIR || path.join(config.ROOT, 'backups'), stamp);
fs.mkdirSync(dest, { recursive: true });
db.open();
db.get().exec(`VACUUM INTO '${path.join(dest, 'store.db').replace(/'/g, "''")}'`);
fs.cpSync(config.UPLOAD_DIR, path.join(dest, 'uploads'), { recursive: true });
console.log(`Copia de seguridad creada en ${dest}`);
console.log('Para restaurarla, detén la tienda y copia store.db y la carpeta uploads/ dentro de la carpeta de datos (DATA_DIR).');
