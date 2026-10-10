'use strict';
// Datos de DEMOSTRACIÓN. Todos los productos, precios y promociones son ejemplos
// (marcados con is_demo = 1) y pueden eliminarse desde Panel → Respaldo y datos.
const db = require('./db');
const catalog = require('./catalog');

const CATEGORIES = [
  ['Domótica y hogar inteligente', 'domotica-hogar-inteligente', 'Centrales, kits y automatizaciones para controlar tu hogar desde el celular.', 'cat-domotica.svg', 'home'],
  ['Cámaras Wi-Fi para interiores', 'camaras-wifi-interiores', 'Vigila tu hogar, tus mascotas o tu negocio en tiempo real.', 'cat-camaras-interior.svg', 'camera'],
  ['Cámaras de seguridad para exteriores', 'camaras-seguridad-exteriores', 'Cámaras resistentes a la intemperie con visión nocturna.', 'cat-camaras-exterior.svg', 'outdoor'],
  ['Asistentes inteligentes y Alexa', 'asistentes-inteligentes-alexa', 'Controla tus dispositivos con la voz y crea rutinas.', 'cat-asistentes.svg', 'speaker'],
  ['Interruptores y enchufes inteligentes', 'interruptores-enchufes-inteligentes', 'Enciende y apaga equipos desde cualquier lugar.', 'cat-interruptores.svg', 'switch'],
  ['Iluminación inteligente', 'iluminacion-inteligente', 'Bombillos y tiras LED con colores, horarios y escenas.', 'cat-iluminacion.svg', 'bulb'],
  ['Sensores y alarmas', 'sensores-alarmas', 'Detecta movimiento, apertura de puertas y más.', 'cat-sensores.svg', 'sensor'],
  ['Accesorios y conectividad', 'accesorios-conectividad', 'Routers, extensores y accesorios para tu red.', 'cat-accesorios.svg', 'router'],
];

const DEMO_NOTE = '\n\n(Producto de demostración: nombre, precio y características son ejemplos para mostrar el funcionamiento de la tienda.)';

const PRODUCTS = [
  {
    name: 'Cámara Wi-Fi 360° 2K para interiores', cat: ['camaras-wifi-interiores'], brand: 'Marca Ejemplo', model: 'CAM-IN360',
    short: 'Rotación horizontal 360°, visión nocturna y audio bidireccional.',
    desc: 'Cámara de interior con giro motorizado para cubrir toda la habitación. Recibe alertas de movimiento en tu celular y habla con tu familia desde la aplicación.',
    specs: 'Resolución: 2K (2304 x 1296)\nÁngulo: 360° horizontal / 114° vertical\nVisión nocturna: Infrarroja hasta 10 m\nAlmacenamiento: microSD hasta 256 GB\nAlimentación: 5 V / 1 A',
    conn: 'Wi-Fi 2.4 GHz', compat: 'Alexa, Google Assistant', box: 'Cámara\nCable USB y adaptador\nKit de montaje',
    price: 159900, promo: 129900, stock: 15, featured: 1, is_new: 0, images: ['p-camara-360.svg', 'p-camara-360-b.svg'], kw: 'camara ip bebe mascotas vigilancia',
  },
  {
    name: 'Cámara exterior tipo bala Full HD', cat: ['camaras-seguridad-exteriores'], brand: 'Marca Ejemplo', model: 'CAM-OUT-B1',
    short: 'Resistente al agua y al polvo, con visión nocturna a color.',
    desc: 'Ideal para entradas, parqueaderos y fachadas. Detección de personas y notificaciones en tiempo real.',
    specs: 'Resolución: 1080p\nProtección: IP66\nVisión nocturna: a color con reflectores\nAlmacenamiento: microSD / nube',
    conn: 'Wi-Fi 2.4 GHz, Ethernet', compat: 'Alexa', box: 'Cámara\nAdaptador de corriente\nTornillos y chazos',
    price: 189900, promo: null, stock: 8, featured: 1, is_new: 1, images: ['p-camara-bala.svg'], kw: 'camara exterior intemperie fachada',
  },
  {
    name: 'Cámara PTZ exterior doble lente', cat: ['camaras-seguridad-exteriores'], brand: 'Marca Demo', model: 'PTZ-DUO',
    short: 'Giro y zoom remoto con doble lente para vista amplia y detalle.',
    desc: 'Controla el giro de la cámara desde tu celular y sigue automáticamente el movimiento detectado.',
    specs: 'Resolución: 2 x 3 MP\nGiro: 355° horizontal / 90° vertical\nProtección: IP65\nSeguimiento automático: Sí',
    conn: 'Wi-Fi 2.4 GHz', compat: '', box: 'Cámara\nFuente de poder\nKit de instalación',
    price: 289900, promo: 259900, stock: 3, availability: 'pocas', featured: 1, images: ['p-camara-ptz.svg'], kw: 'camara ptz exterior zoom',
  },
  {
    name: 'Timbre inteligente con cámara', cat: ['camaras-seguridad-exteriores', 'domotica-hogar-inteligente'], brand: 'Marca Demo', model: 'DB-100',
    short: 'Mira y habla con quien toca tu puerta desde el celular.',
    desc: 'Timbre con video, detección de movimiento y comunicación bidireccional.',
    specs: 'Resolución: 1080p\nBatería recargable: Sí\nÁngulo: 160°',
    conn: 'Wi-Fi 2.4 GHz', compat: 'Alexa', box: 'Timbre\nCampana interior\nAccesorios de montaje',
    price: 239900, promo: null, stock: null, availability: 'pedido', featured: 0, is_new: 1, images: ['p-timbre.svg'], kw: 'timbre video portero',
  },
  {
    name: 'Parlante inteligente con asistente de voz', cat: ['asistentes-inteligentes-alexa'], brand: 'Marca Ejemplo', model: 'VOZ-MINI',
    short: 'Música, rutinas y control del hogar por voz.',
    desc: 'Parlante compacto con asistente de voz para controlar tus dispositivos compatibles, escuchar música y crear rutinas.',
    specs: 'Micrófonos: 4 de largo alcance\nSonido: 360°\nBotón de silencio de micrófono: Sí',
    conn: 'Wi-Fi, Bluetooth', compat: 'Alexa', box: 'Parlante\nAdaptador de corriente',
    price: 219900, promo: 189900, stock: 12, featured: 1, images: ['p-parlante.svg'], kw: 'alexa parlante asistente voz echo',
  },
  {
    name: 'Pantalla inteligente 8" con asistente', cat: ['asistentes-inteligentes-alexa'], brand: 'Marca Ejemplo', model: 'VOZ-SCREEN8',
    short: 'Ve tus cámaras, videollamadas y controla el hogar desde la pantalla.',
    desc: 'Pantalla táctil con asistente de voz para visualizar cámaras compatibles, recetas, calendario y controles del hogar.',
    specs: 'Pantalla: 8" HD táctil\nCámara: 13 MP con obturador\nAltavoces: estéreo',
    conn: 'Wi-Fi, Bluetooth', compat: 'Alexa', box: 'Pantalla\nAdaptador de corriente',
    price: 549900, promo: null, stock: 4, featured: 0, images: ['p-pantalla.svg'], kw: 'pantalla alexa show',
  },
  {
    name: 'Interruptor inteligente Wi-Fi doble', cat: ['interruptores-enchufes-inteligentes'], brand: 'Marca Demo', model: 'SW-2G',
    short: 'Controla dos circuitos de luz desde la app o por voz.',
    desc: 'Interruptor táctil de pared con programación horaria y control remoto.',
    specs: 'Canales: 2\nRequiere neutro: Sí\nCarga máxima: 600 W por canal\nPanel: vidrio templado',
    conn: 'Wi-Fi 2.4 GHz', compat: 'Alexa, Google Assistant', box: 'Interruptor\nTornillos\nManual',
    price: 89900, promo: null, stock: 25, featured: 1, images: ['p-interruptor.svg'], kw: 'interruptor pared touch',
  },
  {
    name: 'Enchufe inteligente con medición de consumo', cat: ['interruptores-enchufes-inteligentes'], brand: 'Marca Demo', model: 'PLUG-E',
    short: 'Programa horarios y mide el consumo de tus equipos.',
    desc: 'Convierte cualquier equipo en inteligente: enciéndelo o apágalo desde el celular y consulta su consumo.',
    specs: 'Corriente máxima: 16 A\nMedición de energía: Sí\nTemporizador: Sí',
    conn: 'Wi-Fi 2.4 GHz', compat: 'Alexa, Google Assistant', box: 'Enchufe\nManual',
    price: 59900, promo: 49900, stock: 40, featured: 0, is_new: 0, images: ['p-enchufe.svg'], kw: 'toma enchufe smart plug',
  },
  {
    name: 'Bombillo LED inteligente RGB', cat: ['iluminacion-inteligente'], brand: 'Marca Ejemplo', model: 'BULB-RGB9',
    short: '16 millones de colores, blancos regulables y escenas.',
    desc: 'Crea ambientes, programa horarios y controla la intensidad desde la app o con la voz.',
    specs: 'Potencia: 9 W\nRosca: E27\nTemperatura de color: 2700 K – 6500 K',
    conn: 'Wi-Fi 2.4 GHz', compat: 'Alexa, Google Assistant', box: 'Bombillo',
    price: 39900, promo: null, stock: 60, featured: 1, images: ['p-bombillo.svg'], kw: 'bombillo foco luz color',
  },
  {
    name: 'Tira LED inteligente 5 m', cat: ['iluminacion-inteligente'], brand: 'Marca Ejemplo', model: 'STRIP-5',
    short: 'Iluminación decorativa con sincronización musical.',
    desc: 'Tira LED adhesiva para muebles, televisores y techos, con modos de color y música.',
    specs: 'Longitud: 5 m\nRecortable: Sí\nModo música: Micrófono integrado',
    conn: 'Wi-Fi 2.4 GHz, Bluetooth', compat: 'Alexa', box: 'Tira LED\nControlador\nFuente de poder',
    price: 79900, promo: null, stock: 0, featured: 0, is_new: 1, images: ['p-tira-led.svg'], kw: 'cinta led tira luces',
  },
  {
    name: 'Sensor de movimiento inteligente', cat: ['sensores-alarmas'], brand: 'Marca Demo', model: 'PIR-01',
    short: 'Recibe alertas y activa automatizaciones al detectar movimiento.',
    desc: 'Sensor infrarrojo para alarmas y automatizaciones (por ejemplo, encender luces al entrar).',
    specs: 'Alcance: hasta 7 m\nÁngulo: 120°\nBatería: CR2450',
    conn: 'Zigbee', compat: 'Alexa', box: 'Sensor\nBatería\nAdhesivo',
    price: 69900, promo: null, stock: 18, featured: 0, images: ['p-sensor.svg'], kw: 'sensor pir alarma movimiento',
  },
  {
    name: 'Kit de seguridad: cámara + sensor + central', cat: ['sensores-alarmas', 'domotica-hogar-inteligente'], brand: 'Marca Demo', model: 'KIT-SEC',
    short: 'Paquete para comenzar a proteger tu hogar.',
    desc: 'Kit con cámara de interior, sensor de movimiento y central para automatizaciones.',
    specs: 'Incluye: 1 cámara, 1 sensor, 1 central\nAlarma sonora: en la central',
    conn: 'Wi-Fi 2.4 GHz, Zigbee', compat: 'Alexa', box: 'Cámara\nSensor\nCentral\nCables',
    price: 349900, promo: 299900, stock: 6, featured: 1, is_offer: 1, images: ['p-kit.svg'], kw: 'kit alarma combo paquete',
  },
  {
    name: 'Central domótica Zigbee', cat: ['domotica-hogar-inteligente'], brand: 'Marca Ejemplo', model: 'HUB-Z3',
    short: 'Conecta sensores y dispositivos Zigbee a tu red.',
    desc: 'Central que permite vincular sensores y accesorios Zigbee y crear automatizaciones.',
    specs: 'Protocolos: Zigbee 3.0\nDispositivos: hasta 64',
    conn: 'Wi-Fi 2.4 GHz, Zigbee', compat: 'Alexa, Google Assistant', box: 'Central\nCable USB',
    price: 119900, promo: null, stock: 10, featured: 0, images: ['p-hub.svg'], kw: 'hub gateway zigbee central',
  },
  {
    name: 'Router Wi-Fi mesh (paquete x2)', cat: ['accesorios-conectividad'], brand: 'Marca Demo', model: 'MESH-2',
    short: 'Cobertura Wi-Fi estable en toda la casa para tus cámaras.',
    desc: 'Sistema mesh para eliminar zonas sin señal y mejorar la conexión de tus dispositivos inteligentes.',
    specs: 'Estándar: Wi-Fi 6\nCobertura: hasta 370 m² (2 unidades)\nPuertos: 2 Gigabit por unidad',
    conn: 'Wi-Fi 6, Ethernet', compat: '', box: '2 routers\n2 adaptadores\nCable de red',
    price: 399900, promo: null, stock: 5, featured: 0, images: ['p-router-mesh.svg'], kw: 'router mesh extensor wifi señal',
  },
];

const PROMOS = [
  { title: 'Kit de seguridad con descuento', subtitle: 'Cámara + sensor + central en un solo paquete. Promoción de ejemplo.', image: '/demo/promo-kit.svg', button_text: 'Ver kit', link_url: '/producto/kit-de-seguridad-camara-sensor-central' },
  { title: 'Ilumina tu hogar con escenas', subtitle: 'Bombillos y tiras LED inteligentes. Promoción de ejemplo.', image: '/demo/promo-luces.svg', button_text: 'Ver iluminación', link_url: '/categoria/iluminacion-inteligente' },
];

function seedDemo() {
  const d = db.get();
  if (d.prepare('SELECT COUNT(*) AS n FROM categories').get().n > 0) return false;
  const catIds = {};
  CATEGORIES.forEach(([name, slug, description, image, icon], i) => {
    catIds[slug] = catalog.saveCategory(
      { name, slug, description, image: `/demo/${image}`, icon, sort_order: (i + 1) * 10, active: 1, is_demo: 0 },
      null
    );
  });
  PRODUCTS.forEach((p, i) => {
    const id = catalog.saveProduct(
      {
        name: p.name, brand: p.brand, model: p.model, short_description: p.short, description: p.desc + DEMO_NOTE,
        specs: p.specs, connectivity: p.conn, compatibility: p.compat, box_contents: p.box, keywords: p.kw,
        price: p.price, promo_price: p.promo, stock: p.stock, availability: p.availability || 'disponible',
        featured: p.featured, is_new: p.is_new, is_offer: p.is_offer, active: 1, sort_order: i,
        category_ids: p.cat.map((s) => catIds[s]), is_demo: 1,
      },
      null
    );
    for (const img of p.images) catalog.addImage(id, `/demo/${img}`, `${p.name} (imagen de ejemplo)`);
  });
  PROMOS.forEach((pr, i) => catalog.savePromotion({ ...pr, active: 1, sort_order: i, is_demo: 1 }, null));
  return true;
}

// Elimina productos y promociones de demostración (las categorías se conservan para que las edites).
function removeDemo() {
  db.tx((d) => {
    d.prepare('DELETE FROM products WHERE is_demo = 1').run();
    d.prepare('DELETE FROM promotions WHERE is_demo = 1').run();
  });
}

function demoCount() {
  return db.get().prepare('SELECT COUNT(*) AS n FROM products WHERE is_demo = 1').get().n;
}

module.exports = { seedDemo, removeDemo, demoCount };
