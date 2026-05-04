# Deployment Guide — Mari Energies MOC System

This guide covers two scenarios:
1. **Local / offline run** — for testing on your laptop
2. **Online deployment** — for running on a public server (cPanel/DirectAdmin/VPS)

---

## 0. Prerequisites

| Software | Min version | How to check |
| --- | --- | --- |
| Node.js | 20.x | `node -v` |
| npm | 10.x | `npm -v` |
| MariaDB or MySQL | 10.5+ | `mysql --version` |

On macOS:
```bash
brew install node@20 mariadb
brew services start mariadb
```

On Ubuntu / Debian:
```bash
sudo apt update
sudo apt install -y nodejs npm mariadb-server
sudo systemctl start mariadb
```

---

## 1. Restore the database

Open a terminal in the bundle folder.

```bash
# Login to MariaDB / MySQL as root
mysql -u root -p

# Inside the SQL prompt:
CREATE DATABASE mari_moc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mari_moc'@'localhost' IDENTIFIED BY 'change_me_strong_password';
GRANT ALL PRIVILEGES ON mari_moc.* TO 'mari_moc'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Now load the dump:
mysql -u mari_moc -p mari_moc < database/db_dump.sql
```

> If you prefer to keep the original DB / user names from the live server,
> open `database/db_dump.sql` in a text editor and change the `USE …;` line.

---

## 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```ini
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_NAME=mari_moc
DB_USER=mari_moc
DB_PASSWORD=change_me_strong_password

JWT_SECRET=<generate a long random string e.g. `openssl rand -hex 48`>
JWT_EXPIRES_IN=7d

# Where uploaded MOC attachments live (relative to backend/ or absolute)
UPLOAD_DIR=./uploads

# Public URL (used in emails / PDF metadata)
PUBLIC_URL=http://localhost:3000
```

Install dependencies:

```bash
npm install
```

---

## 3. Run locally (offline test)

From the `backend/` folder:

```bash
node server.js
```

You should see:

```
✓ Database connected
✓ Server listening on http://localhost:3000
```

In a **second terminal**, serve the frontend:

```bash
cd frontend
# any static server works:
npx serve -l 8080 .
# or:  python3 -m http.server 8080
```

Open `http://localhost:8080`.

> Edit `frontend/js/api.js` line 1:
> ```js
> const API_BASE = 'http://localhost:3000/api';
> ```
> when running locally; change it back to your public URL for production.

### Default logins
| Role | Email | Password |
| --- | --- | --- |
| Admin | (the original admin user in the dump) | (your existing password) |
| Mock test users | `*.@mari.test` (11 accounts) | `Mari@2026` |

To re-seed the 11 mock hierarchy users:
```bash
cd backend
node scripts/seedMocUsers.js
```

---

## 4. Deploy online (production)

### Option A — VPS / Linux server (recommended)

```bash
# On the server:
mkdir -p ~/apps/mari-moc && cd ~/apps/mari-moc

# Upload the bundle (e.g. with scp from your laptop):
#   scp -r mari-moc-offline-bundle user@server:~/apps/mari-moc/

# Install + DB restore
cd backend
npm install --production
cp .env.example .env       # then edit DB credentials, JWT_SECRET, PUBLIC_URL

mysql -u root -p < ../database/db_dump.sql   # or use your own DB workflow

# Start with pm2 (auto-restart, logs)
sudo npm install -g pm2
pm2 start server.js --name mari-moc
pm2 save
pm2 startup        # follow the printed command to enable on boot
```

Serve the frontend with **nginx**:

```nginx
server {
  listen 80;
  server_name moc.your-domain.com;

  root /home/USER/apps/mari-moc/frontend;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3000/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Add HTTPS with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d moc.your-domain.com
```

Update `frontend/js/api.js`:
```js
const API_BASE = 'https://moc.your-domain.com/api';
```

---

### Option B — DirectAdmin / cPanel shared hosting

This is how the live `mari.proflowenergy.org` is deployed.

1. **Create the database** in DirectAdmin's *MySQL Management*.
2. Upload `database/db_dump.sql` via *phpMyAdmin → Import*.
3. Create a Node.js app in *Setup Node.js App*:
   - Application root: `domains/your-domain.com/sdm-crm`
   - Application URL: `your-domain.com` (or a subdomain)
   - Application startup file: `server.js`
   - Node version: `20.x`
4. SCP / SFTP the `backend/` contents into that folder:
   ```bash
   scp -r backend/* user@server:~/domains/your-domain.com/sdm-crm/
   ```
5. SCP the frontend into the public web root:
   ```bash
   scp -r frontend/* user@server:~/domains/your-domain.com/sdm-crm/public_html/
   ```
6. SSH in and install dependencies:
   ```bash
   ssh user@server
   cd ~/domains/your-domain.com/sdm-crm
   /opt/alt/alt-nodejs20/root/usr/bin/npm install --production
   ```
7. Create `.env` (use `.env.example.from-server` as a template — **rotate JWT_SECRET and DB password**).
8. Restart the app from DirectAdmin's Node.js panel — or:
   ```bash
   nohup /opt/alt/alt-nodejs20/root/usr/bin/node server.js &
   ```

The DirectAdmin Node runner auto-respawns the process; killing it spawns a fresh one.

---

## 5. Verify

```bash
curl https://your-domain.com/api/mocs    # should return HTTP 401 (auth required) — that means the API is live
```

Open the site, log in as admin, confirm:
- Dashboard loads
- MOC Register lists records from the dump
- Users page shows 11 `*.mari.test` users with positions assigned
- Create a test MOC, submit, log in as the next person in the chain → action panel appears

---

## 6. Useful commands

```bash
# Take a fresh DB dump (offsite backup)
mysqldump --single-transaction --routines --triggers \
  -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > backup_$(date +%F).sql

# Re-seed mock hierarchy users (idempotent — updates if email already exists)
cd backend && node scripts/seedMocUsers.js

# Apply a new migration manually
mysql -u $DB_USER -p $DB_NAME < migrations/008_something.sql

# Tail server logs (pm2)
pm2 logs mari-moc --lines 200

# Restart after code changes
pm2 restart mari-moc
```

---

## 7. Folder map (what to redeploy when you change something)

| You changed | Re-upload |
| --- | --- |
| Anything in `backend/src/` or a model | full `backend/` folder + restart Node |
| Frontend `js/`, `css/`, `index.html` | the changed file(s) into `public_html/` (or static root). Hard-refresh the browser. |
| New migration in `backend/migrations/` | run it with `mysql … < migrations/NNN.sql` |
| Logo / favicon | `frontend/img/logo.png` |

---

## 8. Security checklist before going live

- [ ] Rotate `JWT_SECRET` to a fresh random string (`openssl rand -hex 48`)
- [ ] Use a strong, unique DB password
- [ ] Force HTTPS (Let's Encrypt or hosting panel)
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Disable Sequelize logging in production (already off in `src/models/index.js`)
- [ ] Change all `*.mari.test` mock user passwords (or delete them)
- [ ] Confirm `.env` is **not** in `public_html/` — only in the backend root
- [ ] Set up automatic database backups

---

## Need to roll back?

The dump represents a known-good state. To reset:
```bash
mysql -u root -p
DROP DATABASE mari_moc;
CREATE DATABASE mari_moc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
mysql -u mari_moc -p mari_moc < database/db_dump.sql
```

Then restart the Node process.
