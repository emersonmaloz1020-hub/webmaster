#!/usr/bin/env bash
# =============================================================================
#  Instalador de la tienda SmartHome_Vpar en un servidor Vultr (Ubuntu 22.04/24.04)
#
#  Uso (como root, desde la consola de Vultr o por SSH):
#    curl -fsSL https://raw.githubusercontent.com/emersonmaloz1020-hub/webmaster/claude/smarthome-vpar-store-a3f21t/smarthome-vpar/deploy/instalar-vultr.sh | bash
#
#  Con dominio propio (el registro DNS "A" ya debe apuntar a la IP del servidor):
#    curl -fsSL ...instalar-vultr.sh | bash -s -- tudominio.com
#
#  Qué hace:
#    - Instala Node.js 22, Git y Caddy (servidor web con HTTPS automático).
#    - Descarga la tienda en /opt/smarthome-vpar y guarda los datos en /var/lib/smarthome-vpar.
#    - La deja como servicio que arranca solo y se reinicia si falla.
#    - Activa el firewall (SSH, 80 y 443) y una copia de seguridad diaria (se guardan 14 días).
#  Se puede ejecutar de nuevo sin perder productos ni fotos.
# =============================================================================
set -euo pipefail

DOMAIN="${1:-}"
DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%%/*}"; DOMAIN="${DOMAIN#www.}"
REPO="${REPO:-https://github.com/emersonmaloz1020-hub/webmaster.git}"
BRANCH="${BRANCH:-claude/smarthome-vpar-store-a3f21t}"
APP_USER="smarthome"
SRC_DIR="/opt/smarthome-vpar"
APP_DIR="$SRC_DIR/smarthome-vpar"
DATA_DIR="/var/lib/smarthome-vpar"
BACKUP_DIR="/var/backups/smarthome-vpar"
PORT=""

paso() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
error() { printf '\n\033[1;31mERROR: %s\033[0m\n' "$1" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || error "Ejecuta este instalador como root (usuario por defecto de Vultr)."
. /etc/os-release 2>/dev/null || true
[ "${ID:-}" = "ubuntu" ] || [ "${ID:-}" = "debian" ] || error "Este instalador es para Ubuntu o Debian (sistema detectado: ${PRETTY_NAME:-desconocido})."

# Evita chocar con otra página web que ya use los puertos 80/443 en este servidor.
if ss -ltnp 2>/dev/null | grep -E ':(80|443)\s' | grep -vq caddy; then
  ss -ltnp | grep -E ':(80|443)\s' || true
  error "Otro programa (por ejemplo Nginx o Apache) ya usa el puerto 80 o 443. Detenlo o pide ayuda para integrar la tienda con él."
fi

PUBLIC_IP="$(curl -fsS4 --max-time 10 https://api.ipify.org || hostname -I | awk '{print $1}')"

paso "Instalando paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
# Quita el repositorio externo de Caddy (Cloudsmith) si quedó de un intento anterior: hoy responde 402.
rm -f /etc/apt/sources.list.d/caddy-stable.list /usr/share/keyrings/caddy-stable-archive-keyring.gpg
apt-get update -y
apt-get install -y curl git ca-certificates gnupg ufw debian-keyring debian-archive-keyring apt-transport-https sqlite3

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  paso "Instalando Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

if ! command -v caddy >/dev/null; then
  paso "Instalando Caddy (HTTPS automático)"
  if ! apt-get install -y caddy; then
    # Respaldo: versión oficial publicada en GitHub.
    ARCH="$(dpkg --print-architecture)"
    curl -fsSL "https://github.com/caddyserver/caddy/releases/download/v2.10.2/caddy_2.10.2_linux_${ARCH}.tar.gz" | tar -xz -C /usr/bin caddy
    chmod +x /usr/bin/caddy
    id caddy >/dev/null 2>&1 || useradd --system --home /var/lib/caddy --create-home --shell /usr/sbin/nologin caddy
    mkdir -p /etc/caddy
    cat > /etc/systemd/system/caddy.service <<'UNIT'
[Unit]
Description=Caddy
After=network-online.target
Wants=network-online.target

[Service]
User=caddy
Group=caddy
ExecStart=/usr/bin/caddy run --environ --config /etc/caddy/Caddyfile
ExecReload=/usr/bin/caddy reload --config /etc/caddy/Caddyfile --force
TimeoutStopSec=5s
LimitNOFILE=1048576
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
UNIT
    systemctl daemon-reload
  fi
fi
caddy version

paso "Descargando la tienda"
id "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$SRC_DIR" --shell /usr/sbin/nologin "$APP_USER"
if [ -d "$SRC_DIR/.git" ]; then
  git -C "$SRC_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$SRC_DIR" reset --hard FETCH_HEAD
else
  rm -rf "$SRC_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$SRC_DIR"
fi
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund

mkdir -p "$DATA_DIR" "$BACKUP_DIR"
chown -R "$APP_USER:$APP_USER" "$SRC_DIR" "$DATA_DIR"

paso "Configurando la tienda"
# Puerto interno: se conserva el de una instalación anterior o se busca uno libre
# (este servidor puede tener otras aplicaciones, por ejemplo con pm2).
if [ -f "$APP_DIR/.env" ]; then
  PORT="$(grep -E '^PORT=' "$APP_DIR/.env" | cut -d= -f2 || true)"
fi
if [ -z "$PORT" ]; then
  PORT=3080
  while ss -ltn | awk '{print $4}' | grep -Eq "[:.]$PORT\$"; do PORT=$((PORT + 1)); done
fi
echo "Puerto interno de la tienda: $PORT"
if [ -n "$DOMAIN" ]; then
  SITE_URL="https://$DOMAIN"
  COOKIE_SECURE=1
else
  # Sin dominio: dirección HTTPS gratuita basada en la IP (servicio sslip.io).
  SITE_URL="https://${PUBLIC_IP//./-}.sslip.io"
  COOKIE_SECURE=0
fi
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=$PORT
DATA_DIR=$DATA_DIR
TRUST_PROXY=1
COOKIE_SECURE=$COOKIE_SECURE
SEED_DEMO=1
MAX_UPLOAD_MB=10
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

cat > /etc/systemd/system/smarthome-vpar.service <<EOF
[Unit]
Description=Tienda SmartHome_Vpar
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node --no-warnings=ExperimentalWarning server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable smarthome-vpar >/dev/null
systemctl restart smarthome-vpar

paso "Configurando el servidor web (Caddy)"
if [ -n "$DOMAIN" ]; then
  cat > /etc/caddy/Caddyfile <<EOF
$DOMAIN, www.$DOMAIN {
	encode gzip
	request_body {
		max_size 120MB
	}
	reverse_proxy 127.0.0.1:$PORT
}
EOF
else
  cat > /etc/caddy/Caddyfile <<EOF
${PUBLIC_IP//./-}.sslip.io {
	encode gzip
	request_body {
		max_size 120MB
	}
	reverse_proxy 127.0.0.1:$PORT
}

:80 {
	encode gzip
	request_body {
		max_size 120MB
	}
	reverse_proxy 127.0.0.1:$PORT
}
EOF
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
systemctl enable caddy >/dev/null
systemctl restart caddy

paso "Activando firewall"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

paso "Programando copia de seguridad diaria (3:00 a. m.)"
cat > /etc/cron.daily/smarthome-vpar-backup <<EOF
#!/bin/sh
# Copia diaria de la base de datos y las fotos de SmartHome_Vpar (se conservan 14 días).
STAMP=\$(date +%Y-%m-%d)
mkdir -p $BACKUP_DIR
sqlite3 $DATA_DIR/store.db ".backup '$BACKUP_DIR/store-\$STAMP.db'"
tar -czf $BACKUP_DIR/fotos-\$STAMP.tar.gz -C $DATA_DIR uploads
find $BACKUP_DIR -type f -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/smarthome-vpar-backup

# Script para actualizar la tienda cuando haya cambios en GitHub.
cat > /usr/local/bin/actualizar-tienda <<EOF
#!/bin/sh
set -e
git -C $SRC_DIR fetch --depth 1 origin "\${1:-$BRANCH}"
git -C $SRC_DIR reset --hard FETCH_HEAD
cd $APP_DIR && npm ci --omit=dev --no-audit --no-fund
chown -R $APP_USER:$APP_USER $SRC_DIR
systemctl restart smarthome-vpar
echo "Tienda actualizada."
EOF
chmod +x /usr/local/bin/actualizar-tienda

paso "Comprobando"
for i in $(seq 1 20); do
  curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:$PORT/healthz" >/dev/null || { journalctl -u smarthome-vpar -n 40 --no-pager; error "La tienda no arrancó. Revisa los mensajes de arriba."; }

CODE="$(journalctl -u smarthome-vpar --no-pager | grep -o 'código: [A-F0-9]*' | tail -1 | awk '{print $2}')"

printf '\n\033[1;32m¡Listo! SmartHome_Vpar está funcionando.\033[0m\n\n'
echo "  Tienda:            $SITE_URL"
echo "  Panel:             $SITE_URL/admin"
[ -z "$DOMAIN" ] && echo "  (También por IP:   http://$PUBLIC_IP — sin candado de seguridad)"
if [ -n "$CODE" ]; then
  echo
  echo "  Código para crear tu administrador: $CODE"
  echo "  Ábrelo en $SITE_URL/admin/setup"
  echo "  (Si lo pierdes: journalctl -u smarthome-vpar | grep código)"
fi
echo
echo "  Datos y fotos:     $DATA_DIR"
echo "  Copias diarias:    $BACKUP_DIR"
echo "  Actualizar tienda: actualizar-tienda"
echo "  Ver registros:     journalctl -u smarthome-vpar -f"
echo
echo "  Si la dirección https tarda en abrir, espera 1–2 minutos: Caddy está obteniendo el certificado."
echo "  Revisa también que el firewall de Vultr (Firewall Groups) permita los puertos 80 y 443."
