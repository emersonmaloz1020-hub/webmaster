# Publicar SmartHome_Vpar en Internet con tu propio dominio

La tienda es una aplicación Node.js que guarda la base de datos (SQLite) y las fotografías **en disco**. Por eso el hosting debe ofrecer **almacenamiento persistente** (un disco o volumen que no se borre al reiniciar). Hostings “estáticos” como GitHub Pages, Netlify o Vercel **no sirven** para esta tienda.

Los precios indicados son aproximados a la fecha de redacción y pueden cambiar: verifícalos en la página de cada proveedor.

## Opción recomendada — Tu servidor Vultr (instalación automática)

Como ya pagas Vultr, la tienda puede vivir en tu propio servidor sin costos extra de hosting. El instalador `deploy/instalar-vultr.sh` deja todo listo: Node.js 22, la tienda como servicio que arranca sola, HTTPS gratuito con Caddy, firewall y copia de seguridad diaria de la base de datos y las fotos.

**Requisitos:** un servidor (instancia) de Vultr con **Ubuntu 22.04 o 24.04**. Basta el plan más pequeño (1 GB de RAM). Si el servidor ya muestra otra página web con Nginx o Apache, el instalador se detiene para no dañarla; en ese caso crea una instancia nueva o pide ayuda para combinarlas.

### Paso 1 — Abrir la consola del servidor

- **Desde el celular o el computador, sin programas:** entra a <https://my.vultr.com> → **Products** → tu servidor → icono de pantalla **View Console** (arriba a la derecha). Inicia sesión como `root` con la contraseña que aparece en la pestaña **Overview** del servidor (icono del ojo para verla y botón para copiarla).
- **Por SSH (computador):** `ssh root@IP-DE-TU-SERVIDOR`.

### Paso 2 — Ejecutar el instalador

Copia y pega esta línea completa y pulsa Enter:

```bash
curl -fsSL https://raw.githubusercontent.com/emersonmaloz1020-hub/webmaster/claude/smarthome-vpar-store-a3f21t/smarthome-vpar/deploy/instalar-vultr.sh | bash
```

Si ya tienes dominio y su registro DNS **A** apunta a la IP del servidor, agrégalo al final:

```bash
curl -fsSL https://raw.githubusercontent.com/emersonmaloz1020-hub/webmaster/claude/smarthome-vpar-store-a3f21t/smarthome-vpar/deploy/instalar-vultr.sh | bash -s -- tudominio.com
```

Tarda de 2 a 5 minutos. Al final muestra:

- la dirección de la tienda. Sin dominio será del tipo `https://45-76-12-34.sslip.io`: una dirección segura gratuita formada con la IP de tu servidor, que abre en cualquier celular;
- el **código** para crear tu administrador en `/admin/setup`.

### Paso 3 — Crear el administrador y configurar

1. Abre `https://…/admin/setup` en tu celular, escribe el código, tu usuario y contraseña.
2. En el panel: **Configuración → WhatsApp** (tu número) y **Configuración → SEO → Dirección pública** (la dirección que mostró el instalador).
3. Carga tus productos y elimina los de demostración.

### Firewall de Vultr

Si la dirección no abre, revisa en Vultr **Network → Firewall**: si tu servidor tiene un *Firewall Group* asignado, agrega reglas que permitan **TCP 80** y **TCP 443** (además de 22 para SSH).

### Conectar tu dominio después

1. En tu registrador de dominio crea registros **A** para `tudominio.com` y `www` con la IP del servidor (o usa **Network → DNS** de Vultr y cambia los *nameservers* del dominio a los de Vultr).
2. Espera a que propague (minutos a pocas horas) y vuelve a ejecutar el instalador con el dominio al final. Tus productos y fotos se conservan.
3. Actualiza la **Dirección pública** en el panel.

### Mantenimiento

| Tarea | Comando en la consola |
|---|---|
| Actualizar la tienda con los últimos cambios de GitHub | `actualizar-tienda` |
| Ver lo que está pasando (registros) | `journalctl -u smarthome-vpar -f` |
| Reiniciar la tienda | `systemctl restart smarthome-vpar` |
| Restablecer contraseña del panel | `cd /opt/smarthome-vpar/smarthome-vpar && sudo -u smarthome npm run create-admin -- admin "NuevaClave2026"` |
| Copias de seguridad | Se crean solas cada día en `/var/backups/smarthome-vpar` (14 días) |

Recomendación adicional: activa **Automatic Backups** del servidor en Vultr (costo adicional pequeño) para tener una copia completa fuera del servidor.

## Opción A — Render (la más sencilla, sin servidor propio)

Requiere plan de pago porque el disco persistente no está disponible en el plan gratuito (aprox. US$7/mes por el servicio + US$0,25/GB/mes por el disco).

1. Crea una cuenta en <https://render.com> e inicia sesión con GitHub.
2. **New → Blueprint** y elige este repositorio. Render detecta el archivo `render.yaml` de la raíz, que ya configura:
   - carpeta `smarthome-vpar`, Node 22, comando `npm start`;
   - disco persistente de 1 GB montado en `/var/data` (`DATA_DIR`);
   - verificación de salud en `/healthz`.
3. Cuando lo pida, escribe `ADMIN_USER` y `ADMIN_PASSWORD` (tu usuario y una contraseña segura). Si los dejas vacíos, usa `/admin/setup` con el código que aparece en **Logs**.
4. Espera a que termine el despliegue y abre la dirección `https://smarthome-vpar.onrender.com` (o la que asigne Render).
5. **Dominio propio:** en el servicio → **Settings → Custom Domains → Add**. Render te indicará los registros DNS (un `CNAME` para `www` y un `A`/`ALIAS` para el dominio raíz). Agrégalos en el panel de tu registrador de dominio. El certificado HTTPS se genera automáticamente.
6. En la tienda: **Panel → Configuración → SEO → Dirección pública** = `https://www.tudominio.com`.

## Opción B — Railway

1. Cuenta en <https://railway.app> (plan Hobby, aprox. US$5/mes con uso incluido).
2. **New Project → Deploy from GitHub repo**, carpeta raíz `smarthome-vpar` (*Settings → Root Directory*).
3. Agrega un **Volume** montado en `/data` y la variable `DATA_DIR=/data`, además de `NODE_ENV=production`.
4. *Settings → Networking → Generate Domain* o *Custom Domain* para tu dominio.

## Opción C — Servidor VPS (DigitalOcean, Hostinger VPS, Contabo, etc.)

Costo aprox. US$4–8/mes. Requiere algo más de conocimiento técnico (o la ayuda de un técnico una sola vez).

```bash
# En Ubuntu 22.04/24.04
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git caddy
git clone https://github.com/<tu-usuario>/webmaster.git
cd webmaster/smarthome-vpar
npm ci --omit=dev
cp .env.example .env     # edita: NODE_ENV=production, DATA_DIR=/var/lib/smarthome-vpar
sudo mkdir -p /var/lib/smarthome-vpar && sudo chown $USER /var/lib/smarthome-vpar
```

Servicio permanente con systemd (`/etc/systemd/system/smarthome-vpar.service`):

```ini
[Unit]
Description=SmartHome_Vpar
After=network.target

[Service]
WorkingDirectory=/home/<usuario>/webmaster/smarthome-vpar
ExecStart=/usr/bin/npm start
Restart=always
User=<usuario>
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now smarthome-vpar
journalctl -u smarthome-vpar -f    # aquí aparece el código de configuración inicial
```

HTTPS automático con Caddy (`/etc/caddy/Caddyfile`):

```
www.tudominio.com, tudominio.com {
    reverse_proxy localhost:3000
}
```

`sudo systemctl reload caddy`. En tu registrador crea registros `A` para `tudominio.com` y `www` apuntando a la IP del VPS.

Copias automáticas diarias (crontab -e):

```
0 3 * * * cd /home/<usuario>/webmaster/smarthome-vpar && BACKUP_DIR=/home/<usuario>/respaldos npm run backup
```

## Opción D — Docker

El proyecto incluye `Dockerfile`. Monta un volumen en `/data`:

```bash
docker build -t smarthome-vpar ./smarthome-vpar
docker run -d -p 3000:3000 -v smarthome-data:/data -e NODE_ENV=production --name smarthome-vpar smarthome-vpar
```

## Comprar el dominio

- Dominios `.com`: aprox. US$10–15/año. Dominios `.co`: aprox. US$25–40/año. Dominios `.com.co`: se registran con proveedores acreditados por .CO Internet; el precio varía según el registrador.
- Registradores comunes: Namecheap, Cloudflare Registrar, GoDaddy, Hostinger, o registradores colombianos.
- Después de comprarlo, configura los registros DNS que indique tu hosting (ver arriba). La propagación puede tardar de minutos a 48 horas.

## Lista de verificación después de publicar

1. Crea tu administrador (o ingresa con `ADMIN_USER`/`ADMIN_PASSWORD`).
2. Configura WhatsApp, dirección pública (`https://…`), datos de contacto y políticas.
3. Carga tus productos reales y elimina los datos de demostración.
4. Abre la tienda desde tu celular y prueba un botón de WhatsApp.
5. Registra tu sitio en [Google Search Console](https://search.google.com/search-console) y envía `https://tudominio.com/sitemap.xml`.
6. Crea o vincula tu [Perfil de Negocio de Google](https://www.google.com/business/) si tienes punto físico.
7. Programa copias de seguridad periódicas.

Variables de entorno disponibles: ver `.env.example`.
