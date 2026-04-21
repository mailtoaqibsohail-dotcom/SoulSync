# Deploying Spark to InterServer

End-to-end checklist for shipping Spark to an **InterServer VPS** (Linux
Cloud VPS / Dedicated). Everything below assumes Ubuntu 22.04 LTS —
translate the `apt` commands if you picked a different distro.

The frontend is static React, the backend is Node + Express + Socket.io,
and MongoDB runs on Atlas (free tier is plenty to start). WebRTC calls and
the browser geolocation API **require HTTPS** — step 5 handles that.

Target domain used throughout: `spark.proflowenergy.org`. Swap it for
your own everywhere it appears.

---

## 0. Prerequisites (one-time)

- An InterServer VPS with a public IP.
- A domain/subdomain whose DNS `A` record points at that IP.
  (On your registrar: `spark  A  <vps-ip>`)
- A MongoDB Atlas cluster. Free tier: https://www.mongodb.com/cloud/atlas
- A Cloudinary account (free tier): https://cloudinary.com/
- SMTP credentials for OTP emails (Gmail app password works fine).

---

## 1. Provision the VPS

SSH in as root, create a non-root user, and lock things down:

```bash
ssh root@<vps-ip>

# Non-root user (answer the prompts)
adduser spark
usermod -aG sudo spark
rsync -a /root/.ssh /home/spark/ && chown -R spark:spark /home/spark/.ssh

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# Re-login as the new user
exit
ssh spark@<vps-ip>
```

## 2. Install Node, nginx, PM2, certbot

```bash
# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx git

# PM2 globally
sudo npm install -g pm2
```

## 3. Pull the code

```bash
sudo mkdir -p /var/www/spark
sudo chown -R spark:spark /var/www/spark
cd /var/www/spark

# Clone your repo (or rsync the local project up — either works)
git clone <YOUR_REPO_URL> .
# If you're not using git, from your Mac:
#    rsync -avz --exclude node_modules --exclude build "/Users/aqibsohail/Dating app/" spark@<vps-ip>:/var/www/spark/

npm run install:all
```

## 4. Configure environment

```bash
# Server secrets — fill everything in
cd /var/www/spark/server
cp .env.example .env
nano .env
# Must set at minimum:
#   MONGO_URI, JWT_SECRET, CLOUDINARY_*, SMTP_*, CLIENT_URL

# Client build URL already lives at client/.env.production — confirm it:
cat /var/www/spark/client/.env.production
# REACT_APP_API_URL=https://spark.proflowenergy.org
```

Build the React bundle:

```bash
cd /var/www/spark/client
npm run build    # writes to client/build/
```

## 5. SSL + nginx

```bash
# Drop in the site config
sudo cp /var/www/spark/deploy/nginx.conf /etc/nginx/sites-available/spark

# Before the cert is issued, nginx -t will complain about the missing
# fullchain.pem. Temporarily comment out the two `ssl_certificate*` lines
# and the whole 443 server block (or just use the HTTP 80 block) so
# certbot can run, then put the file back exactly as shipped.
sudo ln -s /etc/nginx/sites-available/spark /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Issue the cert — certbot edits the nginx config for you
sudo certbot --nginx -d spark.proflowenergy.org --redirect \
    --email you@example.com --agree-tos --non-interactive

# Auto-renewal is installed as a systemd timer. Verify:
sudo systemctl list-timers | grep certbot
```

Restore the full `deploy/nginx.conf` (if you edited it temporarily) and
reload:

```bash
sudo cp /var/www/spark/deploy/nginx.conf /etc/nginx/sites-available/spark
sudo nginx -t && sudo systemctl reload nginx
```

## 6. Start the API with PM2

```bash
cd /var/www/spark
pm2 start ecosystem.config.js
pm2 save                 # remember the running processes
pm2 startup              # prints a systemd command — run it as instructed
```

Quick smoke tests:

```bash
curl -I https://spark.proflowenergy.org/            # 200 with index.html
curl    https://spark.proflowenergy.org/api/health  # {"status":"ok", ...}
```

Open the site in a browser. Socket.io, WebRTC, photos, geolocation should
all work now that you're on HTTPS.

## 7. Updates later

```bash
cd /var/www/spark
git pull
(cd server && npm install --omit=dev)
(cd client && npm install && npm run build)
pm2 restart spark-api
sudo systemctl reload nginx    # only if deploy/nginx.conf changed
```

---

## Common gotchas

- **CORS / socket 400s**: `CLIENT_URL` in `.env` must exactly match the
  HTTPS origin the browser sees. No trailing slash.
- **Geolocation + mic/cam blocked**: browsers only grant these on HTTPS
  origins. If step 5 didn't complete, WebRTC calls won't work.
- **Uploads failing with 413**: bump `client_max_body_size` in nginx (we
  set 25m) and also the `express.json({limit})` in `server/server.js`.
- **Atlas connection timeout**: whitelist your VPS's IP in Atlas →
  Network Access, or use `0.0.0.0/0` if you understand the tradeoff.
- **PM2 keeps restarting**: `pm2 logs spark-api` — usually a missing
  env var. Check `server/.env` is populated.
