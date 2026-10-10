'use strict';
const config = require('./src/config');
const { createApp } = require('./src/app');
const auth = require('./src/auth');
const seed = require('./src/seed');

const app = createApp();

// Administrador inicial opcional desde variables de entorno (ADMIN_USER / ADMIN_PASSWORD).
if (auth.adminCount() === 0 && process.env.ADMIN_USER && process.env.ADMIN_PASSWORD) {
  try {
    auth.createAdmin(process.env.ADMIN_USER, process.env.ADMIN_PASSWORD);
    console.log(`[SmartHome_Vpar] Administrador "${process.env.ADMIN_USER}" creado desde variables de entorno.`);
  } catch (e) {
    console.error(`[SmartHome_Vpar] No se pudo crear el administrador: ${e.message}`);
  }
}

if (config.SEED_DEMO && seed.seedDemo()) {
  console.log('[SmartHome_Vpar] Se cargaron categorías y productos de DEMOSTRACIÓN.');
}

app.listen(config.PORT, () => {
  console.log(`[SmartHome_Vpar] Tienda disponible en http://localhost:${config.PORT}`);
  console.log(`[SmartHome_Vpar] Datos guardados en: ${config.DATA_DIR}`);
  if (auth.adminCount() === 0) {
    console.log(`\n[SmartHome_Vpar] Aún no hay administrador. Abre /admin/setup y usa este código: ${auth.getSetupCode()}\n`);
  }
});
