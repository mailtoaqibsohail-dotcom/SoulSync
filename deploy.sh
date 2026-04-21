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

echo "==> Using pre-built client/build from repo"
# Client is built on the developer's Mac (nodevenv has version conflicts that
# make server-side builds unreliable) and committed to the repo. Just verify.
if [ ! -f "$REPO/client/build/index.html" ]; then
    echo "ERROR: client/build/index.html missing. Run 'npm run build' locally and commit."
    exit 1
fi

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
