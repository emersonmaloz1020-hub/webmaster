# Arquitectura técnica

## Tecnología elegida

| Capa | Tecnología | Motivo |
|---|---|---|
| Servidor | Node.js 22 + Express 4 | Simple, muy difundido, fácil de alojar |
| Vistas | EJS renderizado en el servidor | Páginas rápidas e indexables por Google (SEO), sin compilación |
| Base de datos | SQLite (módulo `node:sqlite` incluido en Node) | Archivo único, sin servidor de base de datos, sin costo, fácil de respaldar |
| Imágenes | Disco del servidor (`DATA_DIR/uploads`) vía `multer` | Persistente, sin servicios externos |
| Estilos / JS | CSS y JavaScript propios, sin frameworks | Carga rápida y mantenimiento sencillo |
| Dependencias | Solo `express`, `ejs` y `multer` | Menos superficie de errores y vulnerabilidades |

## Estructura

```
smarthome-vpar/
├── server.js              # Arranque: datos demo, admin inicial, puerto
├── src/
│   ├── app.js             # Configuración de Express, cabeceras de seguridad, variables comunes
│   ├── config.js          # Variables de entorno (.env)
│   ├── db.js              # Esquema SQLite
│   ├── catalog.js         # Productos, categorías, imágenes, promociones, búsqueda y filtros
│   ├── settings.js        # Configuración editable (apariencia, WhatsApp, contacto, SEO, políticas)
│   ├── auth.js            # Contraseñas (scrypt), sesiones, CSRF, límite de intentos
│   ├── uploads.js         # Validación y guardado de imágenes
│   ├── seed.js            # Datos de demostración
│   ├── helpers.js         # Formato COP, precios promocionales, WhatsApp, utilidades
│   ├── icons.js           # Íconos SVG
│   └── routes/
│       ├── public.js      # Tienda, catálogo, fichas, carrito, sitemap, robots
│       └── admin.js       # Panel administrativo
├── views/                 # Plantillas (públicas y admin/)
├── public/                # CSS, JS, logotipo e ilustraciones de demostración
├── scripts/               # create-admin, backup, generate-demo-images
├── tests/                 # Pruebas automáticas
└── data/                  # (se crea solo) store.db + uploads/  ← NO se sube a GitHub
```

## Modelo de datos

- `categories` (con `parent_id` para subcategorías, orden, visibilidad, SEO)
- `products` (precios en COP como enteros, promoción con vigencia, existencias, disponibilidad, etiquetas, SEO, texto de búsqueda normalizado sin tildes)
- `product_categories` (un producto puede estar en varias categorías)
- `product_images` (orden; la primera es la principal; texto ALT)
- `promotions` (banners con vigencia)
- `orders` (pedidos del carrito; total calculado en el servidor)
- `settings` (clave/valor para todo lo personalizable)
- `admins`, `sessions`

## Seguridad

- Contraseñas con **scrypt** y sal aleatoria; mínimo 10 caracteres.
- Sesiones con token aleatorio guardado como *hash*; cookie `HttpOnly`, `SameSite=Lax` y `Secure` en producción; vencen en 7 días.
- **Token CSRF** obligatorio en todas las acciones del panel.
- Límite de 5 intentos fallidos de inicio de sesión por IP cada 15 minutos.
- Configuración inicial protegida por un código que solo aparece en la consola del servidor.
- Imágenes validadas por su **firma binaria** (no por la extensión); nombres aleatorios; SVG no permitido en cargas; límite de tamaño.
- Cabeceras: Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS en producción.
- Plantillas con escape automático (prevención de XSS); consultas SQL parametrizadas.
- Los colores y tipografías solo aceptan valores válidos (lista blanca / formato hexadecimal).
- El panel envía `noindex` y `robots.txt` bloquea `/admin`.
- Los precios del carrito se recalculan siempre en el servidor.
- Secretos (contraseña inicial, etc.) solo en variables de entorno / `.env`, excluido de Git.

## Modalidades de venta

1. **Inicial (por defecto):** catálogo + botón de WhatsApp con mensaje prellenado (`wa.me`).
2. **Ampliada (casilla “Habilitar carrito”):** carrito en el navegador → el servidor registra el pedido (`orders`) con precios oficiales → se abre WhatsApp con el detalle. Gestión de estados en el panel.

### Cómo añadir pagos en línea (Wompi / Mercado Pago)

La integración requiere credenciales del comercio y no está activada. Pasos recomendados:

1. Añadir en `orders` las columnas `payment_status`, `payment_ref`, `payment_provider`.
2. Crear `src/payments/wompi.js` (o `mercadopago.js`) que, a partir de un pedido ya guardado, genere:
   - **Wompi:** enlace al *Web Checkout* con la firma de integridad (SHA‑256 de referencia + monto en centavos + moneda + secreto de integridad).
   - **Mercado Pago:** una *preferencia* con el SDK oficial y redirigir a `init_point`.
3. Ruta `POST /api/pagos/webhook` que verifique la firma del evento (secreto de eventos de Wompi / `x-signature` de Mercado Pago) y actualice `payment_status`. **Nunca** confiar solo en la redirección del navegador.
4. Guardar las llaves en variables de entorno (`WOMPI_PUBLIC_KEY`, `WOMPI_INTEGRITY_SECRET`, `WOMPI_EVENTS_SECRET`, etc.).
5. La tienda **no** recibe ni almacena datos de tarjetas: el pago ocurre en la página de la pasarela.

### Otras ampliaciones previstas

- Cálculo de envíos: tabla `shipping_zones` (ciudad/departamento → tarifa) y su suma en `POST /api/pedidos`.
- Imágenes en la nube: reemplazar `saveImage`/`removeImage` en `src/uploads.js` por un cliente S3/R2 (la ruta pública queda en la base de datos igual que hoy).
- Base de datos más grande: el acceso está centralizado en `catalog.js`/`settings.js`, lo que facilita migrar a PostgreSQL si el volumen lo exigiera.
