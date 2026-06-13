# Spark — Project Handoff / Briefing

> Spark (GitHub repo name: **SoulSync**) is a dating app — auth, profile setup, swipe/discover,
> matching, realtime chat, audio/video calls, push notifications. This doc is everything another
> engineer/agent needs to work on it cold.

## 1. Tech stack
- **Backend:** Node.js + Express, MongoDB (Atlas) via Mongoose, Socket.IO (realtime), JWT auth (bcryptjs), express-rate-limit, express-validator.
- **Frontend:** React 18 (Create React App / react-scripts), react-router-dom v6, axios, socket.io-client. Wrapped as an **Android app via Capacitor 8** (push, splash, status-bar plugins).
- **External services:** MongoDB Atlas (DB), Cloudinary (photo/media uploads), Twilio (SMS), Firebase Admin / FCM (push notifications), SMTP email (now via **Brevo relay** — see §8).

## 2. Repo layout
Repo root: this workspace (`/Users/aqibsohail/Dating app`). Spark lives in **`server/`** + **`client/`** (the other top-level dirs — `proflow-marketing/`, `sdm-crm*/`, `mari-*/` — are unrelated apps).

```
server/                 # Express API + Socket.IO
  server.js             # entry — CORS, rate limits, route mounts, socket init, static client serving
  config/db.js          # mongoose.connect(MONGO_URI)
  config/cloudinary.js  # Cloudinary config
  routes/auth.js        # /api/auth  (register, login, OTP verify, forgot/reset password)
  routes/users.js       # /api/users (profile, photos, search, settings, reports)
  routes/matches.js     # /api/matches (swipes, matches, etc.)
  models/               # User.js, Match.js, Message.js, Swipe.js, Report.js
  middleware/auth.js    # JWT verify middleware
  socket/index.js       # initSocket() — realtime chat + call signaling
  utils/mailer.js       # nodemailer SMTP (OTP verify + password reset emails)
  utils/push.js         # Firebase Admin / FCM push notifications
  firebase-service-account.json   # FCM credentials (DO NOT commit publicly)

client/                 # React (CRA)
  src/App.js, index.js
  src/pages/            # Login, Register, VerifyOtp, ForgotPassword, ResetPassword,
                        # SetupProfile, Discover, Matches, Chat, Inbox, Call, Search,
                        # MyProfile, ViewProfile, Settings
  src/components/       # SwipeCard, Navbar, ChatPopup, FloatingInbox, IncomingCallModal,
                        # MessageBubble, NotificationBell, Logo, etc.
  src/context/          # AuthContext.js (axios baseURL + JWT), SocketContext.js (socket.io-client)
  src/hooks/ src/utils/ src/native/ (Capacitor bridges)
  client/android/       # Capacitor Android project (APK build)
  client/build/         # PRE-BUILT production bundle, committed to the repo (see §7 caveat)
```

## 3. Backend API surface
- `POST /api/auth/*` — register, login, verify OTP, forgot/reset password. Rate-limited (`authLimiter`).
- `/api/users/*` — profile CRUD, photo upload (Cloudinary via multer), search, settings, report user.
- `/api/matches/*` — swipe, list matches.
- `GET /api/health` — health check.
- **Socket.IO** — realtime chat messages + WebRTC call signaling (offer/answer/ICE). `io` is attached via `app.set('io', io)` so routes can emit.
- Static: in production the server serves the React build from `../public_html` with SPA fallback (any non-`/api` non-`/socket.io` GET → `index.html`).

## 4. Data models (Mongoose)
`User` (profile, auth, photos, push tokens, settings), `Swipe` (like/pass), `Match` (mutual like), `Message` (chat), `Report` (user reports).

## 5. Environment variables (server `.env`)
```
PORT=5001                 # local dev (server.js default 5000; client proxy + AuthContext expect 5001)
NODE_ENV=production
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<secret>
JWT_EXPIRES_IN=<e.g. 7d>
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER
CLIENT_URL=<allowed CORS origin, e.g. https://spark.proflowenergy.org>
SMTP_HOST / SMTP_PORT / SMTP_SECURE / SMTP_USER / SMTP_PASS / MAIL_FROM   # see §8 (Brevo)
SMTP_REJECT_UNAUTHORIZED   # optional; defaults to false (accept self-signed)
# Push: FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS (path to firebase-service-account.json)
```
**Client** `.env.production`: `REACT_APP_API_URL=https://spark.proflowenergy.org`. Local dev uses `http://localhost:5001` (CRA `proxy` + AuthContext/SocketContext fallback).

## 6. Run locally
```
# backend
cd server && npm install && npm run dev      # nodemon server.js on PORT (5001)
# frontend
cd client && npm install && npm start         # CRA dev server, proxies /api to localhost:5001
```
Need a `server/.env` with at least MONGO_URI + JWT_SECRET (+ Cloudinary/Twilio/SMTP for those features).

## 7. Production / deployment

> **⚠️ LIVE SITE IS NOW https://sparkdating.club** (migrated 2026-06-13).
> The old `spark.proflowenergy.org` is retired and just serves a "we've moved" notice — **do NOT deploy the app there anymore.** All new deployments target `sparkdating.club`.

- **GitHub repo:** `mailtoaqibsohail-dotcom/SoulSync`. Active branch: `feat/spark-admin-panel`.
- **Live URL:** **https://sparkdating.club** (+ `www.`). Admin panel: https://sparkdating.club/admin
- **Host:** Linode VPS, IP `69.164.242.176`, **DirectAdmin** (LiteSpeed/Apache front, panel on :2222). SSH as **root** (key auth).
- **Where the app lives on the box:**
  - **Server (Node/Express):** `/home/admin/domains/spark.proflowenergy.org/server` — *this path did NOT change in the migration.* pm2 runs `server.js` here on port **5001**. One shared Node process serves the API for every domain.
  - **Client (React build):** `/home/admin/domains/sparkdating.club/public_html` ← **NEW location.** This is the web root the live domain serves.
- **Process manager:** **pm2** (as root), app name **`spark`**. Restart after server code changes: `pm2 restart spark && pm2 save`. (`ecosystem.config.js` in the server dir loads `.env`; for env changes use `pm2 startOrRestart ecosystem.config.js --update-env && pm2 save`.)
- **Routing:** DirectAdmin per-domain file `/usr/local/directadmin/data/users/admin/domains/sparkdating.club.cust_httpd` proxies `/api/` + `/socket.io/` → `127.0.0.1:5001`; everything else is served statically from `public_html` with SPA fallback (`.htaccess`).

### Deploy steps (rsync from the developer's Mac — there is NO git clone on the server)
```bash
# 1. Build the client locally (server can't build CRA reliably) and commit it
cd client && npm run build && cd ..
git add -A client/build && git commit -m "build" && git push

# 2. Push the React build to the LIVE domain's web root
rsync -az --delete -e ssh client/build/ \
  root@69.164.242.176:/home/admin/domains/sparkdating.club/public_html/

# 3. Push server code (only if server/ changed) to where pm2 runs it
rsync -az -e ssh --exclude node_modules --exclude .env \
  --exclude firebase-service-account.json \
  server/ root@69.164.242.176:/home/admin/domains/spark.proflowenergy.org/server/

# 4. On the server: fix ownership, install deps (if package.json changed), restart
ssh root@69.164.242.176 '
  chown -R admin:admin /home/admin/domains/sparkdating.club/public_html
  chown -R admin:admin /home/admin/domains/spark.proflowenergy.org/server
  cd /home/admin/domains/spark.proflowenergy.org/server && npm install --omit=dev
  pm2 restart spark && pm2 save'
```
- **Client-only changes** (UI): steps 1–2 + `chown` are enough — **no pm2 restart needed** (static files).
- **Server changes:** steps 3–4 (pm2 restart required).
- The old `deploy.sh` (git-pull based) at repo root is **not used** here — there's no `~/spark-repo` clone on this box. Deploy via the rsync steps above.

## 8. Email (important context)
- Outbound email **cannot use the VPS's local mail server** — the VPS blocks outbound port 25, so `mail.proflowenergy.org` can't deliver externally.
- Spark sends via **Brevo** (SMTP relay): `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, `SMTP_USER=<brevo login>`, `SMTP_PASS=<brevo SMTP key>`.
- **From address:** target is `MAIL_FROM="Spark Match Making <no-reply@sparkdating.club>"`. **Requires `sparkdating.club` to be authenticated in Brevo (SPF + DKIM)** — add the DKIM/SPF/verification records Brevo provides to GoDaddy DNS and verify the domain there, OR Brevo rejects the send. Until that's done, keep the old verified sender `no-reply@proflowenergy.org` (proflowenergy.org is already DKIM-authenticated in Brevo).
- `utils/mailer.js` sets `tls: { rejectUnauthorized: SMTP_REJECT_UNAUTHORIZED === 'true' }` (default false).
- Brevo free tier = 300 emails/day, **shared** across all ProFlow apps on this server.

## 9. Gotchas
- **pm2 env is baked in at first start.** Editing `server/.env` alone does NOT take effect — pm2 keeps the env it captured. After changing `.env`, restart via the ecosystem file: `cd <server dir> && pm2 startOrRestart ecosystem.config.js --update-env && pm2 save`.
- **Build the client locally** and commit `client/build/` before deploying (see §7).
- CORS origin is checked in `server.js` (`corsOriginCheck`) — new frontend origins must be allowed there / via `CLIENT_URL`.
- Realtime (chat + calls) depends on Socket.IO; the proxy in front must allow `/socket.io/` upgrades.
- `firebase-service-account.json` holds FCM credentials — keep it out of public exposure.

## 10. Access notes (for whoever has the keys)
- SSH: `ssh root@69.164.242.176` (key-based).
- MongoDB: Atlas (connection string in `server/.env` `MONGO_URI`).
- DNS: Cloudflare (zone `proflowenergy.org`).
