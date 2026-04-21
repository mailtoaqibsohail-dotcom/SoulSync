#!/bin/bash
# Spark deploy script — run on the DirectAdmin server via web Terminal.
#
# First-time setup (run once):
#   cd ~ && git clone https://github.com/mailtoaqibsohail-dotcom/SoulSync.git spark-repo
#
# Every deploy after that:
#   cd ~/spark-repo && git pull && bash deploy.sh
set -e

REPO="$HOME/spark-repo"
DOMAIN="$HOME/domains/spark.proflowenergy.org"
NODEVENV="$HOME/nodevenv/domains/spark.proflowenergy.org/server/22"

echo "==> Pulling latest"
cd "$REPO"
git pull

echo "==> Activating Node env"
if [ -f "$NODEVENV/bin/activate" ]; then
    # shellcheck disable=SC1090
    source "$NODEVENV/bin/activate"
else
    echo "WARN: nodevenv not found at $NODEVENV — using system node"
fi

echo "==> Building client"
cd "$REPO/client"
# nodevenv sets NPM_CONFIG_PREFIX globally → installs go to nodevenv's lib,
# not the local client folder. Force local install by clearing prefix and
# pointing explicitly at $PWD.
rm -rf node_modules
unset NPM_CONFIG_PREFIX
unset npm_config_prefix
NODE_ENV=development npm install \
    --prefix "$PWD" \
    --include=dev --production=false \
    --no-audit --no-fund

# Sanity check
if [ ! -f "$PWD/node_modules/react-scripts/bin/react-scripts.js" ]; then
    echo "ERROR: react-scripts still missing at $PWD/node_modules/react-scripts"
    ls "$PWD/node_modules" 2>/dev/null | head
    exit 1
fi

# Run build via explicit node path — no PATH dependency
NODE_ENV=production node "$PWD/node_modules/react-scripts/bin/react-scripts.js" build

echo "==> Syncing client build to public_html"
mkdir -p "$DOMAIN/public_html"
rsync -a --delete "$REPO/client/build/" "$DOMAIN/public_html/"

echo "==> Syncing server code"
mkdir -p "$DOMAIN/server"
rsync -a --delete \
    --exclude node_modules \
    --exclude .env \
    --exclude logs \
    --exclude tmp \
    "$REPO/server/" "$DOMAIN/server/"

echo "==> Installing server deps"
cd "$DOMAIN/server"
npm install --omit=dev --no-audit --no-fund --prefer-offline

echo "==> Restarting Passenger"
mkdir -p "$DOMAIN/server/tmp"
touch "$DOMAIN/server/tmp/restart.txt"

echo ""
echo "✓ Deploy complete"
echo "  Test: curl -I https://spark.proflowenergy.org/api/health"
