#!/usr/bin/env bash
# Deploy framework-siakad to dev-siakadku.riplabs.co.id (nginx + systemd, VPS 38.47.180.178).
# Usage: scripts/deploy-dev.sh [--no-backend]
# Needs: SSH key ~/.ssh/id_ed25519_vpsarif authorised for root on the VPS. No password is ever stored here.
set -euo pipefail
cd "$(dirname "$0")/.."

HOST=root@38.47.180.178
ROOT=/var/www/framework-siakadku.riplabs.co.id
SSH="ssh -i $HOME/.ssh/id_ed25519_vpsarif -o IdentitiesOnly=yes"

# Demo password is read from the server's .env (never printed) so the public "Isi otomatis" buttons work.
# AUTOFILL_ADMIN=1 (default here, per owner's request for testing) also publishes the ADMIN password in the
# bundle; run with AUTOFILL_ADMIN=0 scripts/deploy-dev.sh to keep it out.
AUTOFILL_ADMIN=${AUTOFILL_ADMIN:-1}
DEMOP=$($SSH $HOST "grep '^SEED_DEMO_PASSWORD=' $ROOT/backend/.env | cut -d= -f2-")
ADMP=$($SSH $HOST "grep '^SEED_ADMIN_PASSWORD=' $ROOT/backend/.env | cut -d= -f2-")
if [ "$AUTOFILL_ADMIN" = "1" ]; then ADMIN_ENV="$ADMP"; FLAG=1; else ADMIN_ENV=""; FLAG=0; fi

echo "== frontend build =="
(cd frontend && rm -rf dist && VITE_PUBLIC_AUTOFILL=1 VITE_PUBLIC_AUTOFILL_ADMIN="$FLAG" VITE_DEV_DEMO_PASSWORD="$DEMOP" VITE_DEV_ADMIN_PASSWORD="$ADMIN_ENV" npm run build >/dev/null)
if [ "$AUTOFILL_ADMIN" != "1" ] && grep -rqF -- "$ADMP" frontend/dist; then echo "ABORT: admin password found in bundle" >&2; exit 1; fi

echo "== upload =="
rsync -az --delete -e "$SSH" frontend/dist/ $HOST:$ROOT/frontend/dist/
rsync -az --delete -e "$SSH" --exclude='*.test.*' frontend/src/snippets/ $HOST:$ROOT/frontend/src/snippets/
if [ "${1:-}" != "--no-backend" ]; then
  rsync -az --delete -e "$SSH" --exclude=.venv --exclude=.env --exclude=__pycache__ --exclude=tests --exclude='*.pyc' \
    --exclude=.pytest_cache --exclude=.mypy_cache --exclude=.ruff_cache --exclude=media backend/ $HOST:$ROOT/backend/
  $SSH $HOST "cd $ROOT/backend && chown -R www-data:www-data . && sudo -u www-data .venv/bin/pip install -q -r requirements.txt \
    && sudo -u www-data .venv/bin/python manage.py migrate --noinput | tail -2 && systemctl restart framework-siakadku && sleep 2 && systemctl is-active framework-siakadku"
fi
echo "OK: https://dev-siakadku.riplabs.co.id"
