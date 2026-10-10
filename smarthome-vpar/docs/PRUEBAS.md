# Pruebas de funcionamiento

## Pruebas automáticas (`npm test`)

Se ejecutan contra una base de datos temporal (no tocan tus datos). Resultado actual: **20 de 20 pruebas aprobadas**.

| Criterio de aceptación | Prueba |
|---|---|
| Iniciar sesión en el panel | Configuración inicial con código, cierre de sesión, contraseña incorrecta rechazada, ingreso correcto |
| Visitantes sin acceso administrativo | `GET /admin/*` redirige al ingreso; `POST` sin sesión → 401; sin token CSRF → 403 |
| Crear, editar y eliminar productos | Creación con 2 fotos, edición de precios, desactivación sin perder datos, eliminación con borrado de fotos |
| Cargar fotografías | Subida de JPG y PNG (multipart, como desde un celular); archivo falso con extensión `.png` rechazado |
| Imágenes persistentes tras cerrar sesión | La imagen se sirve después de cerrar sesión y existe en disco |
| Categorías | Creación con portada, visible en inicio y en `/categoria/...`; eliminación sin borrar productos |
| Productos en su categoría | El producto aparece en la página de su categoría |
| Precios y promociones | Precio promocional vigente con precio anterior tachado; promoción vencida vuelve al precio normal; aparece en `/ofertas` |
| Botón de WhatsApp | El enlace `wa.me/573001234567` contiene exactamente el mensaje con nombre, precio en COP y enlace a la ficha |
| Personalización persistente | Colores, tipografía, título del banner, beneficios y logotipo se guardan y se ven en la tienda; colores inválidos se ignoran |
| Búsqueda y filtros | Búsqueda sin tildes ni mayúsculas, por nombre/categoría/palabra clave; filtros de marca, precio y conectividad |
| Validación | Formularios con datos inválidos muestran los errores |
| Carrito | El pedido se registra con precios recalculados en el servidor (ignora precios manipulados) |
| Respaldo y SEO | Exportación JSON, CSV y base de datos; `sitemap.xml` con la dirección pública; `robots.txt` |
| Datos de demostración | Se eliminan sin afectar las categorías |

## Pruebas en navegador real (Chromium, emulación de iPhone 13 y Pixel 7)

Realizadas con Playwright durante el desarrollo:

1. Configuración inicial del administrador desde el celular.
2. Configuración del número de WhatsApp (mensaje de confirmación visible).
3. Creación de un producto subiendo una **foto de 4000 × 3000 px (1,7 MB)**: el panel la optimizó a ~390 KB antes de enviarla, mostró la vista previa y el servidor la guardó.
4. Cierre de sesión y apertura de la ficha pública: la foto sigue disponible, la galería se amplía (y se cierra con Esc) y el botón de WhatsApp genera el mensaje correcto.
5. Menú móvil, panel de filtros deslizable y barra inferior de compra en la ficha.
6. Carrito: agregar con cantidad desde la ficha y desde una tarjeta, contador del carrito, total ($ 649.700 = 2 × 259.900 + 129.900), registro del pedido y apertura de WhatsApp.
7. Revisión visual de todas las páginas del panel en escritorio.

Sin errores de JavaScript en consola durante estos recorridos.

## Prueba manual sugerida antes de publicar

- Desde tu propio celular: crea un producto con una foto tomada con la cámara, ábrelo en la tienda y pulsa el botón de WhatsApp.
- Revisa la tienda en un computador y en una tableta.
