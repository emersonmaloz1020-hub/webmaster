'use strict';
// Uso: npm run create-admin -- usuario "contraseña segura"
// También sirve para restablecer la contraseña de un usuario existente.
const db = require('../src/db');
const auth = require('../src/auth');

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.log('Uso: npm run create-admin -- <usuario> <contraseña>');
  process.exit(1);
}
db.open();
const existing = auth.findAdmin(username);
try {
  if (existing) {
    auth.changePassword(existing.id, password);
    console.log(`Contraseña de "${existing.username}" actualizada.`);
  } else {
    auth.createAdmin(username, password);
    console.log(`Administrador "${username.toLowerCase()}" creado.`);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
