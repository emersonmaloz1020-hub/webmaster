# Servicios externos, costos y configuraciones pendientes

## Servicios que usa la tienda

| Servicio | ¿Obligatorio? | ¿Registro? | Costo | Uso |
|---|---|---|---|---|
| Servidor Vultr (ya contratado) | Sí, para publicar | Ya lo tienes | Lo que ya pagas; basta el plan de 1 GB. Copias automáticas de Vultr: opcional, costo adicional | Ejecutar la tienda y guardar base de datos y fotos |
| Dominio propio | Recomendado | Sí | Aprox. US$10–40/año según extensión | Dirección `www.tudominio.com` |
| WhatsApp / WhatsApp Business (app) | Sí, para recibir consultas | Sí (número de celular) | Gratis | Los botones abren un chat con mensaje prellenado mediante enlaces `wa.me`. **No** requiere la API de WhatsApp Business ni Meta Business |
| Google Fonts | No | No | Gratis | Tipografías. Si eliges “Sistema” no se usa |
| Google Search Console | Recomendado | Sí (cuenta Google) | Gratis | Indexación y seguimiento en Google |
| Certificado HTTPS | Sí | No | Gratis (Let’s Encrypt, gestionado por Caddy) | Conexión segura |
| sslip.io | Solo mientras no tengas dominio | No | Gratis | Dirección HTTPS provisional basada en la IP del servidor |

No se usan servicios de pago para base de datos (SQLite viene incluido) ni para almacenamiento de imágenes (se guardan en el disco del hosting).

Los precios son aproximados y pueden cambiar; verifícalos con cada proveedor.

## Integraciones opcionales (no implementadas, requieren credenciales)

| Integración | Requisitos | Costo |
|---|---|---|
| Pagos en línea con **Wompi** (Bancolombia) | Cuenta de comercio Wompi, llaves pública/privada y secreto de eventos | Comisión por transacción según tarifas vigentes de Wompi |
| Pagos en línea con **Mercado Pago** | Cuenta de vendedor, Access Token y Public Key | Comisión por transacción según tarifas vigentes |
| Cálculo automático de envíos | Contrato o API de transportadora (Servientrega, Coordinadora, Interrapidísimo, etc.) | Según transportadora |
| Almacenamiento de imágenes en la nube (S3, Cloudinary, Cloudflare R2) | Cuenta y llaves de acceso | Plan gratuito limitado / pago por uso |
| Correo de notificación de pedidos | Servicio SMTP (Brevo, Resend, Gmail SMTP) | Plan gratuito limitado |

La arquitectura está preparada para estas ampliaciones (ver `ARQUITECTURA.md`). Ninguna tarjeta ni dato de pago se almacena en la tienda.

## Configuraciones pendientes del propietario

Estos datos **no se inventaron** y debes completarlos en el panel:

- [ ] Número de WhatsApp (Configuración → WhatsApp).
- [ ] Dirección pública de la tienda (Configuración → SEO), una vez publicada.
- [ ] Razón social, NIT, teléfono, correo, dirección, ciudad y horario.
- [ ] Enlaces a redes sociales.
- [ ] Políticas de privacidad (Ley 1581 de 2012), envíos, cambios/devoluciones y garantías (Ley 1480 de 2011). Se recomienda revisión legal.
- [ ] Nota de envíos y pagos (solo condiciones reales).
- [ ] Logotipo definitivo e imagen del banner (fotografías propias o con licencia).
- [ ] Productos reales con fotografías, precios y existencias; luego **eliminar los datos de demostración**.
- [ ] Beneficios comerciales confirmados (los de ejemplo son genéricos; no se afirmaron garantías, certificaciones ni tiempos de entrega).
- [ ] Hosting, dominio y copias de seguridad periódicas.
