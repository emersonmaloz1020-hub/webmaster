# Guía de administración de SmartHome_Vpar

Esta guía explica cómo manejar la tienda **sin programar**. Todo se hace desde el panel: `https://tu-dominio/admin` (o `http://localhost:3000/admin` en tu computador). El panel funciona también desde el celular: el menú se abre con el botón ☰ de la esquina superior izquierda.

## 1. Primer ingreso

1. Entra a `/admin`. Si aún no existe ningún administrador verás **Configuración inicial**.
2. Escribe el **código de configuración**. Aparece en la consola del servidor (o en los *Logs* de tu proveedor de hosting) con el texto `Código de configuración inicial del panel: XXXXXXXX`. Este código evita que otra persona cree la cuenta antes que tú.
3. Elige usuario y contraseña (mínimo 10 caracteres, con letras y números).
4. Después, para entrar usa `/admin/login`. Tras 5 intentos fallidos el ingreso se bloquea 15 minutos.

> ¿Olvidaste la contraseña? En el servidor ejecuta `npm run create-admin -- tuusuario "NuevaClave2026"`.

## 2. Lista de pendientes

El **Escritorio** muestra lo que falta configurar: número de WhatsApp, dirección pública, datos de contacto, políticas y productos de demostración. Cada aviso tiene un botón **Configurar**.

## 3. Productos

**Crear:** Panel → Productos → **+ Nuevo producto**.

| Campo | Recomendación |
|---|---|
| Nombre | Nombre comercial claro (“Cámara Wi‑Fi 360° 2K para interiores”) |
| Marca / Modelo | Solo si los conoces con certeza |
| Descripción corta | Una frase; aparece bajo el nombre y en Google |
| Descripción comercial | Deja una línea en blanco entre párrafos |
| Fotografías | Puedes elegir varias a la vez desde el computador o el celular (cámara o galería) |
| Especificaciones | Una por línea con formato `Nombre: valor` (ej. `Resolución: 2K`) |
| Conectividad / Compatibilidad | Separadas por comas. Se usan en los filtros. Escribe solo compatibilidades confirmadas |
| Precio de venta | En pesos, sin decimales. Puedes escribir `159900` o `159.900` |
| Precio promocional | Opcional y menor al precio de venta. El precio normal aparecerá tachado |
| Promoción desde / hasta | Opcional. Al vencer, el producto vuelve automáticamente a su precio normal |
| Disponibilidad / Existencias | Con 0 existencias se muestra “Agotado” (salvo si eliges “Bajo pedido”). Vacío = no se controla |
| Visible en la tienda | Desmárcalo para ocultar el producto **sin perder su información** |
| Destacado / Nuevo / Oferta | Etiquetas y aparición en la sección “Productos destacados” |
| Categorías | Puedes marcar varias; la primera es la principal |

**Editar:** haz clic en el nombre o en **Editar**. Al final pulsa **Guardar cambios**; verás un mensaje verde de confirmación. Si sales con cambios sin guardar, el navegador te avisará.

**Atajos en la lista:** el interruptor **Visible/Oculto** y la estrella ☆ (destacado) se cambian con un clic.

**Duplicar:** útil para productos parecidos. La copia queda oculta hasta que la revises.

**Eliminar:** botón **Eliminar** → confirma. Borra el producto y sus fotos de forma definitiva. Si solo quieres retirarlo temporalmente, ocúltalo.

### Fotografías

- Las fotos se guardan en el servidor (carpeta `uploads`), no en tu navegador: siguen disponibles después de cerrar sesión y desde cualquier dispositivo.
- Antes de subirlas, el panel **reduce automáticamente** las fotos grandes del celular (máx. 1600 px) para que la tienda cargue rápido.
- Formatos: JPG, PNG, WEBP, GIF o AVIF. Máximo 10 MB por imagen.
- La primera foto es la **principal**. Usa **Hacer principal**, ← y → para reordenar.
- Escribe un **texto alternativo (ALT)** que describa cada foto: ayuda a la accesibilidad y a Google.
- Recomendación: fotos cuadradas, fondo limpio y buena iluminación.

## 4. Categorías

Panel → **Categorías**.

- **Crear/editar:** nombre, descripción, ícono, imagen de portada y orden.
- **Subcategorías:** en “Categoría superior” elige la categoría principal a la que pertenece.
- **Ordenar:** flechas ↑ ↓ en la lista (o el campo “Orden”).
- **Ocultar:** interruptor **Visible/Oculta**. Los productos se conservan.
- **Eliminar:** los productos **no** se borran; solo dejan de pertenecer a esa categoría.

## 5. Promociones

- **Banners promocionales** (Panel → Promociones): título, texto, imagen horizontal (1200 × 500 recomendado), botón con enlace y fechas de vigencia. Se publican solos durante su vigencia.
- **Precios promocionales**: se configuran en cada producto. Los productos con promoción vigente aparecen en la sección Promociones y en `/ofertas`.
- Para enlazar un banner a un producto, abre el producto en la tienda y copia la parte de la dirección que empieza con `/producto/...`.

## 6. Apariencia

Panel → **Apariencia**:

- **Marca:** nombre de la tienda, eslogan, logotipo (PNG transparente cuadrado) e ícono de pestaña.
- **Colores:** fondo, tarjetas, color principal, acento y texto. Casilla para **restaurar los colores originales**.
- **Tipografías:** para textos y para títulos (“Sistema” es la más rápida).
- **Banner principal:** imagen (mín. 1600 × 900), título, subtítulo, texto y textos de los botones.
- **Textos de secciones** y pie de página.
- **Beneficios:** hasta 6, con ícono, título y descripción. Publica solo beneficios reales.
- **Imagen para redes sociales:** la que aparece al compartir el enlace.

Los **productos destacados** se eligen con la estrella en la lista de productos.

## 7. Configuración comercial

Panel → **Configuración**:

- **WhatsApp:** número con indicativo (Colombia: `57` + 10 dígitos, sin `+` ni espacios). Mensaje de consulta con las variables `{producto}`, `{precio}` y `{enlace}`. Botón **Probar enlace**.
- **Modalidad de venta:** activa el **carrito** si quieres que los clientes armen pedidos con varios productos. Los pedidos llegan a **Panel → Pedidos** y el cliente los envía por WhatsApp. No hay cobros en línea.
- **Datos comerciales y contacto**, **redes sociales** (enlaces `https://`), **horario**.
- **Políticas:** privacidad, envíos, devoluciones y garantías. Cada una aparece en el pie de página solo si tiene texto. Revísalas con un asesor legal.
- **SEO:** dirección pública (ej. `https://www.tudominio.com`), título y descripción de la página de inicio.

## 8. Pedidos (solo con carrito habilitado)

Cada pedido muestra código, cliente, teléfono (enlace directo a WhatsApp), productos y total calculado por el servidor. Cambia su estado: Nuevo, Contactado, Confirmado, Enviado, Entregado o Cancelado.

## 9. Copias de seguridad

Panel → **Respaldo y datos**:

- **Base de datos completa (.db):** toda la información (productos, categorías, configuración, pedidos).
- **Exportar todo en JSON** y **Lista de productos (CSV)** para abrir en Excel.
- Las **fotografías** están en la carpeta `uploads` del servidor; inclúyelas con `npm run backup` o con las copias del disco de tu hosting.
- **Eliminar datos de demostración** borra los productos y promociones de ejemplo (las categorías se conservan).

Recomendación: descarga la base de datos al menos una vez por semana y después de cambios importantes.

**Restaurar:** detén la tienda, reemplaza `store.db` (y la carpeta `uploads/` si corresponde) dentro de la carpeta de datos y vuelve a iniciar.

## 10. Mi cuenta

Cambia tu contraseña (se cierran las sesiones en otros dispositivos) y crea o elimina otros administradores.

## Preguntas frecuentes

- **No veo los botones de WhatsApp en la tienda.** Falta configurar el número en Configuración → WhatsApp.
- **Un producto no aparece.** Verifica que esté *Visible*, que tenga categoría y que la categoría también esté visible.
- **El enlace del mensaje de WhatsApp dice `localhost`.** Configura la dirección pública en Configuración → SEO.
- **Cambié algo y no lo veo.** Recarga la página (en el celular, desliza hacia abajo). Las imágenes nuevas siempre tienen un nombre distinto, así que se ven de inmediato.
