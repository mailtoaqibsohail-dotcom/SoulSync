# Mari Energies — MOC System (Offline Bundle)

This bundle contains everything needed to run the **MSP-HSE-08 Management of Change** application offline or to redeploy it on any server.

## Bundle layout

```
mari-moc-offline-bundle/
├── backend/          Node.js + Express + Sequelize API server
│   ├── src/          Models, controllers, routes, services
│   ├── migrations/   SQL migrations (already applied to db_dump.sql)
│   ├── scripts/      Seed scripts (mock hierarchy users, etc.)
│   ├── server.js     Entry point
│   ├── package.json
│   ├── .env.example  Copy to .env and edit
│   └── .env.example.from-server  Live production .env (rename / scrub before use)
├── frontend/         Static SPA (no build step required)
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── img/          Mari Energies logo, favicons
├── database/
│   └── db_dump.sql   Full MariaDB/MySQL dump (schema + data)
├── DEPLOY.md         Full step-by-step deployment guide
└── README.md         This file
```

## Quick reference

| What | Where |
| --- | --- |
| **Backend stack** | Node 20+, Express, Sequelize, MariaDB/MySQL |
| **Frontend stack** | Vanilla JS SPA, served as static files |
| **Database** | Restore `database/db_dump.sql` |
| **Default admin login** | (in the dump) — use the existing `admin@…` user from the live system |
| **Mock test users** | password `Mari@2026` — see `backend/scripts/seedMocUsers.js` |

See **DEPLOY.md** for the full installation walkthrough (local dev + online production).
