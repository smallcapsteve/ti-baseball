#!/usr/bin/env bash
# =====================================================================
# bootstrap-droplet.sh — one-time setup for the TI Baseball static site
# on an Ubuntu droplet that already has (or will have) nginx running.
#
# What it does, in order:
#   1) Installs nginx + certbot if they're missing
#   2) Creates a "deploy" user with restricted sudo for nginx reload
#   3) Installs the deploy user's SSH public key (you paste it in)
#   4) Creates the web root /var/www/tibaseball
#   5) Drops in the nginx vhost (with your real domain substituted in)
#   6) Optionally runs certbot to provision the SSL certificate
#
# Run as root (or with sudo):  sudo bash bootstrap-droplet.sh
# =====================================================================

set -euo pipefail

# ---------- CONFIG: edit these before running ----------
DOMAIN="tibaseball.com"             # already set for you — TI Baseball
DEPLOY_USER="deploy"                # user GitHub Actions will SSH as
DEPLOY_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAID9Fm+3WTv2dUBRPbYr9LUpb8dP672Rk2QRC/Z/J2m9u tibaseball-deploy"
WEB_ROOT="/var/www/tibaseball"
NGINX_CONF_NAME="tibaseball.conf"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_SRC="${SCRIPT_DIR}/../nginx/${NGINX_CONF_NAME}"

# ---------- SANITY CHECKS ----------
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: must run as root.  Try: sudo bash $0" >&2
  exit 1
fi
if [[ "$DOMAIN" == "example.com" ]]; then
  echo "ERROR: edit DOMAIN at the top of this script first." >&2
  exit 1
fi
if [[ -z "$DEPLOY_PUBKEY" ]]; then
  echo "WARNING: DEPLOY_PUBKEY is empty.  The deploy user will be created"
  echo "         without an SSH key — GitHub Actions won't be able to log in."
  echo "         Continue anyway? (you can add the key manually later)"
  read -r -p "[y/N] " ok
  [[ "$ok" == "y" ]] || exit 1
fi
if [[ ! -f "$NGINX_SRC" ]]; then
  echo "ERROR: can't find ${NGINX_SRC}." >&2
  echo "       Run this script from inside the repo so it can find nginx/${NGINX_CONF_NAME}." >&2
  exit 1
fi

echo "==> Updating package lists"
apt-get update -y

echo "==> Installing nginx + certbot if missing"
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx rsync

echo "==> Creating deploy user '${DEPLOY_USER}' (idempotent)"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi

echo "==> Installing SSH public key for ${DEPLOY_USER}"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/${DEPLOY_USER}/.ssh"
if [[ -n "$DEPLOY_PUBKEY" ]]; then
  echo "$DEPLOY_PUBKEY" > "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chmod 600 "/home/${DEPLOY_USER}/.ssh/authorized_keys"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh/authorized_keys"
fi

echo "==> Allowing ${DEPLOY_USER} to reload nginx via sudo (no password)"
cat > "/etc/sudoers.d/${DEPLOY_USER}-nginx" <<EOF
${DEPLOY_USER} ALL=(root) NOPASSWD: /usr/sbin/nginx -s reload, /usr/sbin/nginx -t
EOF
chmod 440 "/etc/sudoers.d/${DEPLOY_USER}-nginx"

echo "==> Creating web root ${WEB_ROOT}"
install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$WEB_ROOT"
# Drop a placeholder so nginx has something to serve until the first deploy
if [[ ! -f "${WEB_ROOT}/index.html" ]]; then
  cat > "${WEB_ROOT}/index.html" <<HTML
<!doctype html><meta charset=utf-8><title>TI Baseball</title>
<body style="font-family:sans-serif;text-align:center;padding:60px">
<h1>TI Baseball</h1>
<p>Site is being deployed — check back in a minute.</p>
</body>
HTML
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${WEB_ROOT}/index.html"
fi

echo "==> Creating ACME webroot for Let's Encrypt"
install -d -m 755 /var/www/letsencrypt

echo "==> Installing nginx vhost"
NGINX_DEST="/etc/nginx/sites-available/${NGINX_CONF_NAME}"
sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "$NGINX_SRC" > "$NGINX_DEST"
ln -sf "$NGINX_DEST" "/etc/nginx/sites-enabled/${NGINX_CONF_NAME}"

echo "==> Removing default nginx site if it's the only one shipping"
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm /etc/nginx/sites-enabled/default
fi

echo "==> Testing nginx config"
# At this point the vhost references certs that don't exist yet; certbot will
# create them. Until then we temporarily swap to an HTTP-only vhost so nginx
# can start. Easiest path: comment out the HTTPS block until certbot runs.
TMP_CONF="$(mktemp)"
awk '
  /^# --- Main HTTPS site ---/  { skip=1 }
  skip                          { print "#" $0; next }
  { print }
' "$NGINX_DEST" > "$TMP_CONF"
mv "$TMP_CONF" "$NGINX_DEST"
nginx -t
systemctl reload nginx || systemctl start nginx

echo "==> Provisioning Let's Encrypt certificate for ${DOMAIN}"
echo "    (this requires that DNS for ${DOMAIN} already points at this droplet)"
echo "    If DNS isn't ready yet, press Ctrl-C and re-run this step later with:"
echo "      sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
echo ""
read -r -p "Run certbot now? [y/N] " run_certbot
if [[ "$run_certbot" == "y" ]]; then
  certbot --nginx --non-interactive --agree-tos \
    --email "admin@${DOMAIN}" \
    -d "${DOMAIN}" -d "www.${DOMAIN}" \
    --redirect

  # Restore the full vhost (uncomment the HTTPS block) so certbot's edits
  # land on the real config.
  sed "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "$NGINX_SRC" > "$NGINX_DEST"
  nginx -t
  systemctl reload nginx
fi

echo ""
echo "==> DONE."
echo "    Web root:          ${WEB_ROOT}"
echo "    nginx vhost:       ${NGINX_DEST}"
echo "    Deploy user:       ${DEPLOY_USER}"
echo ""
echo "Add these as GitHub Actions secrets in your repo:"
echo "    DROPLET_HOST     = $(hostname -I | awk '{print $1}')   (or your domain once DNS resolves)"
echo "    DROPLET_USER     = ${DEPLOY_USER}"
echo "    DEPLOY_PATH      = ${WEB_ROOT}"
echo "    SSH_PRIVATE_KEY  = (the private key matching the public key you pasted above)"
echo ""
