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
# nodevenv forces all npm installs into its global lib/node_modules, ignoring
# --prefix and NPM_CONFIG_PREFIX unset. Workaround: ensure packages are
# installed there (they should be already from prior runs), then symlink
# the global node_modules as the local one so react-scripts can resolve
# its peers relative to cwd.
NODEVENV_LIB="$HOME/nodevenv/domains/spark.proflowenergy.org/server/22/lib/node_modules"

# Make sure react-scripts and client deps are in nodevenv global
if [ ! -f "$NODEVENV_LIB/react-scripts/bin/react-scripts.js" ]; then
    echo "Installing client deps into nodevenv global..."
    NODE_ENV=development npm install --include=dev --production=false --no-audit --no-fund
fi

# Symlink global → local so 'node_modules/react-scripts/...' resolves
rm -rf node_modules
ln -s "$NODEVENV_LIB" node_modules

# Sanity check
if [ ! -f node_modules/react-scripts/bin/react-scripts.js ]; then
    echo "ERROR: react-scripts still not found via symlink"
    ls -la node_modules | head -5
    exit 1
fi

# Build
NODE_ENV=production node node_modules/react-scripts/bin/react-scripts.js build

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
