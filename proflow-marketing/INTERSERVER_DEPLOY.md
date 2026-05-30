# Deploying ProFlow Marketing on InterServer (cPanel + Node.js)

InterServer's shared hosting supports Node.js apps via cPanel's
**"Setup Node.js App"** module. This guide walks the whole flow:
build locally → upload → configure → cron → SSL.

Estimated time: ~45-60 minutes the first time.

## 0. Pre-flight

You'll need:

- A domain or subdomain pointed at your InterServer account
  (e.g. `app.proflow.example`).
- SSH access to your account (Account → Manage SSH Access in cPanel).
  Strongly recommended — File Manager works but is painful for a
  Next.js project.
- Your Supabase / Resend / Anthropic credentials ready (see DEPLOY.md
  for the upstream account checklist).

## 1. Configure Next for standalone output

We want a self-contained bundle so cPanel only has to run one file.

Edit `next.config.mjs`:

```js
const nextConfig = {
  output: 'standalone',
};
export default nextConfig;
```

## 2. Build locally

On your laptop:

```bash
npm install
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  npm run build
```

This produces:

- `.next/standalone/` — the runnable Node app (includes `server.js`).
- `.next/static/` — hashed CSS / JS chunks.
- `public/` — your static assets.

## 3. Assemble the upload bundle

Standalone is missing two folders that need to ride alongside it. From
the project root:

```bash
mkdir -p deploy
cp -R .next/standalone/. deploy/
cp -R .next/static deploy/.next/static
cp -R public deploy/public
cp package.json deploy/
```

`deploy/` is now everything the server needs. Zip it:

```bash
cd deploy && zip -r ../proflow-deploy.zip . && cd ..
```

## 4. Create the Node.js app in cPanel

1. cPanel → **Setup Node.js App** → **Create Application**.
2. **Node.js version:** 18.x or newer.
3. **Application mode:** Production.
4. **Application root:** `proflow` (cPanel creates `/home/<user>/proflow`).
5. **Application URL:** pick your domain or subdomain.
6. **Application startup file:** `server.js`.
7. **Passenger log file:** leave default.
8. Click **Create**.

Don't start it yet — the folder is empty.

## 5. Upload the bundle

Easiest path is SSH:

```bash
scp proflow-deploy.zip user@your-interserver-host:~/proflow/
ssh user@your-interserver-host
cd proflow
unzip proflow-deploy.zip
rm proflow-deploy.zip
```

Or use File Manager → Upload, then Extract.

## 6. Install runtime dependencies

The standalone bundle already includes its own `node_modules`, but a
few native modules (sharp, the React PDF font cache) prefer to be
installed in the target environment. From cPanel → Setup Node.js App
→ your app → **Run NPM Install** button.

If you have SSH:

```bash
cd ~/proflow
# Enter the Node environment that cPanel set up:
source /home/<user>/nodevenv/proflow/18/bin/activate
npm install --omit=dev
```

## 7. Environment variables

In **Setup Node.js App** → your app → **Environment Variables**, add
each row from `.env.local.example`:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase |
| `RESEND_API_KEY` | from Resend |
| `RESEND_FROM_EMAIL` | `"ProFlow Marketing <billing@yourdomain>"` |
| `ANTHROPIC_API_KEY` | optional |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` |
| `CRON_SECRET` | long random string (you'll reuse this in cron) |
| `NEXT_PUBLIC_APP_URL` | `https://app.proflow.example` |
| `PORT` | leave blank — cPanel sets this |

Click **Save**.

## 8. Start the app

Back on the Node.js App row → **Start App**. Status flips to "Started".

Open `https://app.proflow.example`. Sign-in page should render with
Tailwind styling. If it's unstyled HTML, jump to Troubleshooting.

## 9. Apply the Supabase migrations

These run on Supabase, not InterServer. Open the Supabase dashboard
SQL editor and paste each file in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_main_schema.sql`
4. `supabase/migrations/0004_main_rls.sql`

Then create your owner user in Authentication → Users, swap the
placeholder UUID in `supabase/seed.sql`, and run that file too.

## 10. Replace Vercel Cron with cPanel Cron Jobs

The `vercel.json` cron config does nothing here. Set up two cPanel cron
jobs instead.

cPanel → **Cron Jobs** → **Add New Cron Job**:

**Generate recurring invoices (6 AM Pakistan = 01:00 UTC):**

- **Common Settings:** Once a day
- **Minute:** `0`
- **Hour:** `1`
- **Day / Month / Weekday:** `*`
- **Command:**

  ```bash
  curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
    https://app.proflow.example/api/cron/generate-invoices > /dev/null
  ```

**Send payment reminders (same time):**

Repeat with the same schedule and:

```bash
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://app.proflow.example/api/cron/invoice-reminders > /dev/null
```

Use the same `CRON_SECRET` value you set in step 7.

## 11. SSL

cPanel ships with AutoSSL — make sure it's enabled for the domain. If
the certificate hasn't issued yet:

- cPanel → **SSL/TLS Status** → tick your domain → **Run AutoSSL**.

Wait a couple of minutes, then reload your site. Lock icon should
appear.

## 12. Smoke test

1. Sign in as your owner user.
2. Settings → Payment Methods → fill in Wise details → Save.
3. Invoices → + New Invoice → Preview PDF (verifies `react-pdf` works
   on InterServer's Node).
4. AI Assistant → Caption Writer → Generate. (Or watch the fallback
   banner if you skipped Anthropic.)
5. Manually trigger one cron job from your laptop:

   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://app.proflow.example/api/cron/invoice-reminders
   ```

   Should return a JSON list of would-be reminders.

## Troubleshooting

**Unstyled HTML / Tailwind didn't load.** You probably forgot to copy
`.next/static/` into the bundle. Re-upload (step 3 again).

**500 Internal Server Error.** cPanel → Setup Node.js App → your app →
**Stop App** → **Start App** to capture fresh logs. Then cPanel → Errors
or `~/proflow/passenger.log`.

**`Cannot find module '@react-pdf/renderer'` or similar.** The
standalone bundle missed a native dep. SSH in, activate the Node env
(step 6), and run `npm install --omit=dev`.

**`fetch failed` from server actions.** Make sure
`NEXT_PUBLIC_APP_URL` matches your actual public URL — without
trailing slash, with `https://`.

**Cron returns 401 Unauthorized.** Your `CRON_SECRET` env var doesn't
match the `Authorization: Bearer …` header in the cron command. Fix
either one to match.

**Cron returns 404.** The app isn't running or your domain isn't
pointing at the Node app. Double-check the Application URL in Setup
Node.js App.

## Updating later

The clean way:

1. Build locally (step 2).
2. Re-upload the `deploy/` contents over the old folder (or zip + extract).
3. cPanel → Setup Node.js App → **Restart App**.

You don't need to touch env vars or cron unless they actually changed.
