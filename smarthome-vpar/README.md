# SmartHome_Vpar — Tienda virtual

Tienda en línea de tecnología para el hogar inteligente: cámaras de seguridad Wi‑Fi, domótica, asistentes de voz, interruptores e iluminación inteligente. Incluye **catálogo público**, **panel administrativo privado**, **carga de fotografías**, **integración con WhatsApp** y **carrito opcional**, todo con base de datos y almacenamiento persistentes.

> ⚠️ Los productos, precios, marcas y promociones que vienen cargados son **datos de demostración** (aparecen con la etiqueta amarilla **“Ejemplo”**). Puedes editarlos o borrarlos todos desde **Panel → Respaldo y datos → Eliminar datos de demostración**.

## Contenido

| Documento | Para qué sirve |
|---|---|
| [docs/GUIA-ADMINISTRACION.md](docs/GUIA-ADMINISTRACION.md) | Cómo administrar la tienda sin programar: productos, fotos, categorías, precios, apariencia, WhatsApp |
| [docs/PUBLICACION.md](docs/PUBLICACION.md) | Cómo publicar la tienda en Internet con tu propio dominio |
| [docs/SERVICIOS-Y-COSTOS.md](docs/SERVICIOS-Y-COSTOS.md) | Servicios externos, costos recurrentes y configuraciones pendientes |
| [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) | Tecnología, estructura del proyecto, seguridad y cómo ampliar (pagos en línea) |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Pruebas realizadas y cómo ejecutarlas |

## Inicio rápido (en tu computador)

Requisitos: [Node.js 22.5 o superior](https://nodejs.org/) (no requiere instalar bases de datos).

```bash
cd smarthome-vpar
npm install
npm start
```

1. Abre <http://localhost:3000> para ver la tienda.
2. Abre <http://localhost:3000/admin>. La primera vez verás la **configuración inicial**: escribe el **código** que aparece en la consola donde ejecutaste `npm start`, elige tu usuario y una contraseña (mínimo 10 caracteres con letras y números).
3. En el panel, ve a **Configuración → WhatsApp** y escribe tu número (por ejemplo `573001234567`). Hasta que lo hagas, los botones de WhatsApp no se muestran.

Los datos quedan guardados en la carpeta `data/` (`store.db` y `uploads/`). No la borres: allí están tus productos y fotografías.

## Funciones principales

- **Página de inicio**: encabezado con buscador, banner editable, categorías, productos destacados, promociones con vigencia, beneficios configurables, contacto y pie de página.
- **Catálogo**: filtros por categoría, marca, precio, conectividad, compatibilidad, ofertas y disponibilidad; orden por precio, nombre o novedad; buscador sin importar tildes ni mayúsculas.
- **Ficha de producto**: galería con ampliación (teclado y gesto de deslizar), precio en COP con promoción, características técnicas, contenido de la caja, disponibilidad, botón de WhatsApp con mensaje prellenado y productos relacionados.
- **Panel administrativo**: productos, fotografías, categorías y subcategorías, promociones, apariencia (logo, colores, tipografías, banner, textos), configuración comercial, pedidos, copias de seguridad y usuarios.
- **Dos modalidades de venta**: catálogo + WhatsApp (por defecto) o carrito con registro de pedidos enviados por WhatsApp. No hay cobros en línea (ver `docs/ARQUITECTURA.md` para integrar Wompi o Mercado Pago).
- **SEO**: títulos y descripciones editables, URLs limpias, Open Graph, datos estructurados `Product`, `sitemap.xml` y `robots.txt`.

## Comandos

| Comando | Descripción |
|---|---|
| `npm start` | Inicia la tienda |
| `npm run dev` | Inicia y reinicia automáticamente al cambiar el código |
| `npm test` | Ejecuta las pruebas automáticas |
| `npm run backup` | Copia de seguridad completa (base de datos + fotografías) en `backups/` |
| `npm run create-admin -- usuario "clave"` | Crea un administrador o restablece su contraseña |
| `npm run demo-images` | Regenera las ilustraciones de demostración |
