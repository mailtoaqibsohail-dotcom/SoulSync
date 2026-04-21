# Deploy Spark to DirectAdmin — same flow as last time

Two zips: **client** goes in `public_html`, **server** goes in the
`server` folder. Then fill the Node.js form and NPM install. That's it.

---

## 1. Build + make the two zips (on your Mac)

```bash
cd "/Users/aqibsohail/Dating app/client"
npm install
npm run build
```

Now make the zips:

```bash
cd "/Users/aqibsohail/Dating app"

# client.zip — the contents of client/build (not the build folder itself)
cd client/build && zip -r ../../client.zip . && cd ../..

# server.zip — the whole server folder contents
cd server && zip -r ../server.zip . -x "node_modules/*" ".env" "logs/*" && cd ..
```

You now have `client.zip` and `server.zip` in the project root.

## 2. Upload in DirectAdmin File Manager

**client.zip →** `/home/iqraacad/domains/spark.proflowenergy.org/public_html/`
- Delete the old files in `public_html` first.
- Upload `client.zip`, right-click → Extract.
- Confirm `public_html/index.html` exists directly (not nested in a folder).

**server.zip →** `/home/iqraacad/domains/spark.proflowenergy.org/server/`
- Rename the existing `server` folder to `server.old` as a backup.
- Create a fresh empty `server` folder.
- Upload `server.zip` into it, right-click → Extract.

## 3. Fill the Node.js form

In DirectAdmin → Node.js Selector → click the `spark.proflowenergy.org/`
app:

- **Node version**: 22.x (whatever was selected before)
- **Application mode**: production
- **Application root**: `domains/spark.proflowenergy.org/server`
- **Application URL**: `spark.proflowenergy.org`
- **Application startup file**: `server.js`
- **Environment variables** — add each one:
  - `NODE_ENV` = `production`
  - `CLIENT_URL` = `https://spark.proflowenergy.org`
  - `MONGO_URI` = your Atlas string
  - `JWT_SECRET` = 64-char random hex
  - `JWT_EXPIRES_IN` = `30d`
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM`
  - (leave `PORT` blank — Passenger assigns it)

Save.

## 4. NPM install + restart

- Click **Run NPM Install** in the app panel.
- Click the **restart** icon (circular arrow).

## 5. Test

Open https://spark.proflowenergy.org — should load, login should work,
chat should work.

If something breaks, check the log viewer in the Node.js panel — 99% of
the time it's a missing env var.
