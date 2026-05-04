# InterServer Deployment Guide — SDM-CRM

## Prerequisites
- InterServer VPS (Ubuntu 20.04/22.04) or Node.js hosting with SSH
- Domain pointed to your server IP
- MySQL database created via cPanel or SSH

---

## STEP 1 — Server Setup (one time)

```bash
# SSH into your InterServer VPS
ssh user@your-server-ip

# Install Node.js 18 via nvm (most reliable on InterServer)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
nvm alias default 18

# Install PM2 globally
npm install -g pm2
```

---

## STEP 2 — Upload Code

### Option A: Git (recommended)
```bash
cd /home/username
git clone https://github.com/yourorg/sdm-crm.git
cd sdm-crm
```

### Option B: FTP / cPanel File Manager
- Compress project as .zip, upload via cPanel
- Extract to /home/username/sdm-crm/

---

## STEP 3 — Install Dependencies

```bash
cd /home/username/sdm-crm
npm install --production
```

---

## STEP 4 — Create MySQL Database (cPanel)

1. Login to cPanel → MySQL Databases
2. Create database: `sdm_crm`
3. Create user: `sdm_user` with strong password
4. Grant ALL PRIVILEGES on `sdm_crm` to `sdm_user`

Or via SSH:
```sql
mysql -u root -p
CREATE DATABASE sdm_crm CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sdm_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON sdm_crm.* TO 'sdm_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## STEP 5 — Configure Environment

```bash
cd /home/username/sdm-crm
cp .env.example .env
nano .env
```

Fill in:
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
DB_HOST=localhost
DB_NAME=sdm_crm
DB_USER=sdm_user
DB_PASSWORD=YourStrongPassword123!
UPLOADS_DIR=/home/username/sdm-crm/uploads
LOG_DIR=/home/username/sdm-crm/logs
BASE_URL=https://yourdomain.com
```

---

## STEP 6 — Run DB Migrations + Seed

```bash
# Create all tables
node migrations/run.js

# Insert roles + admin user
node migrations/seed.js
```

---

## STEP 7 — Start with PM2

```bash
cd /home/username/sdm-crm
pm2 start ecosystem.config.js --env production

# Save so it auto-starts on server reboot
pm2 save
pm2 startup   # follow the printed command to enable startup script
```

---

## STEP 8 — Configure Domain (Nginx reverse proxy)

Install Nginx if not present:
```bash
sudo apt install nginx -y
```

Create vhost config:
```bash
sudo nano /etc/nginx/sites-available/sdm-crm
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase for PDF uploads if needed
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Serve uploads directly via Nginx (faster than Node)
    location /uploads/ {
        alias /home/username/sdm-crm/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        # Protect: only allow PDF downloads to logged-in users
        # (proxy to Node for auth check, or use X-Accel-Redirect)
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sdm-crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## STEP 9 — SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (runs twice daily)
sudo systemctl enable certbot.timer
```

---

## STEP 10 — PM2 Management Commands

```bash
pm2 status                    # view app status
pm2 logs sdm-crm              # tail logs
pm2 restart sdm-crm           # restart app
pm2 reload sdm-crm            # zero-downtime reload
pm2 monit                     # live dashboard

# After code update:
git pull origin main
npm install --production
pm2 reload sdm-crm
```

---

## STEP 11 — Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
pm2 set pm2-logrotate:compress true
```

---

## Security Checklist

- [ ] Change admin@company.com password after first login
- [ ] Set strong JWT_SECRET (64+ random bytes)
- [ ] DB user has only necessary privileges (no SUPER, no GRANT OPTION)
- [ ] `uploads/` not world-readable — consider auth check in Nginx or Node
- [ ] Firewall: only ports 22, 80, 443 open (`ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable`)
- [ ] Regular DB backups via cron:
  ```bash
  0 2 * * * mysqldump -u sdm_user -pYourPassword sdm_crm | gzip > /home/username/backups/sdm_crm_$(date +\%F).sql.gz
  ```

---

## Folder Permissions

```bash
chmod 755 /home/username/sdm-crm
chmod -R 755 /home/username/sdm-crm/uploads
chmod -R 755 /home/username/sdm-crm/logs
chmod 600 /home/username/sdm-crm/.env
```
