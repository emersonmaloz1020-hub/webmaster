'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');
const config = require('./config');

// Las imágenes se guardan en disco (DATA_DIR/uploads), no en el navegador.
// Se validan por su firma binaria, no solo por la extensión declarada.
const SIGNATURES = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'gif', test: (b) => b.slice(0, 4).toString('ascii') === 'GIF8' },
  { ext: 'webp', test: (b) => b.slice(0, 4).toString('ascii') === 'RIFF' && b.slice(8, 12).toString('ascii') === 'WEBP' },
  { ext: 'avif', test: (b) => b.slice(4, 12).toString('ascii') === 'ftypavif' },
];

function detectImage(buffer) {
  if (!buffer || buffer.length < 12) return null;
  const s = SIGNATURES.find((sig) => sig.test(buffer));
  return s ? s.ext : null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_MB * 1024 * 1024, files: 12 },
});

// Guarda un archivo subido y devuelve la ruta pública (/uploads/xxx.ext). Lanza error si no es una imagen válida.
function saveImage(file) {
  const ext = detectImage(file.buffer);
  if (!ext) throw new Error(`"${file.originalname}" no es una imagen válida (JPG, PNG, WEBP, GIF o AVIF).`);
  const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(config.UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
}

// Elimina un archivo de /uploads (ignora las imágenes de demostración u otras rutas).
function removeImage(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const file = path.join(config.UPLOAD_DIR, path.basename(publicPath));
  fs.rm(file, { force: true }, () => {});
}

// Traduce los errores de multer a mensajes comprensibles.
function friendlyError(err) {
  if (err && err.code === 'LIMIT_FILE_SIZE') return `Cada imagen puede pesar máximo ${config.MAX_UPLOAD_MB} MB.`;
  if (err && err.code === 'LIMIT_FILE_COUNT') return 'Puedes subir máximo 12 imágenes a la vez.';
  return err ? err.message : 'Error al subir el archivo.';
}

module.exports = { upload, saveImage, removeImage, detectImage, friendlyError };
