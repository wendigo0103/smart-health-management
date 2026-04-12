# HealthQueue — Startup Guide

Step-by-step instructions to run the **Smart Healthcare Queue** app locally: React SPA, Express API, MongoDB, and Socket.io on **one dev port** (default **8080**, see `vite.config.ts`).

---

## Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | v20+ recommended (project targets modern ESM). |
| **npm** or **pnpm** | This repo lists `pnpm` as `packageManager`; `npm` works the same for the commands below. |
| **MongoDB** | Running and reachable at the URI you put in `.env` (local install, Docker, or Atlas). |

---

## 1. Install dependencies

From the repository root:

```bash
npm install
```

or:

```bash
pnpm install
```

---

## 2. Configure environment

1. Copy the example file:

   ```bash
   cp .env.example .env
   ```

2. Edit **`.env`** and set at least:

   | Variable | Purpose |
   |----------|---------|
   | `MONGO_URI` | MongoDB connection string, e.g. `mongodb://127.0.0.1:27017/healthqueue` |
   | `JWT_SECRET` | Long random string (used to sign JWTs; never commit real secrets to public repos) |

   Optional:

   - `PORT` — used by **production** server (`npm start`), default `8080` in code if unset.
   - `ALLOW_STAFF_REGISTER=true` — only if you intentionally allow registering `doctor`/`admin` via the public API (normally use `npm run seed` instead).
   - `PING_MESSAGE` — custom message for `GET /api/ping`.

3. **Do not** prefix server-only secrets with `VITE_` — those would be exposed to the browser bundle.

---

## 3. Start MongoDB

Pick one approach.

### Option A — Local `mongod` (macOS / Linux)

Example using a data directory inside the project (ignored by git):

```bash
mkdir -p .mongo-data
mongod --dbpath ./.mongo-data --port 27017 --bind_ip 127.0.0.1
```

Keep this terminal open, or run as a background service (e.g. Homebrew `brew services start mongodb-community`).

> **macOS:** `mongod --fork` is not supported; run in a dedicated terminal or use a service manager.

### Option B — Docker

```bash
docker run -d --name healthqueue-mongo -p 27017:27017 mongo:7
```

Set `MONGO_URI=mongodb://127.0.0.1:27017/healthqueue`.

### Option C — MongoDB Atlas

Create a cluster, get a connection string, set `MONGO_URI` in `.env` (include user, password, and `authSource` if required).

---

## 4. Seed demo users (recommended)

Creates doctors and an admin account if they do not already exist:

```bash
npm run seed
```

**Demo password** for all seeded accounts (printed in the script output): `Doctor123!`

**Seeded emails** (typical):

- `dr.sarah@healthqueue.demo`
- `dr.michael@healthqueue.demo`
- `admin@healthqueue.demo`

Register **patients** through the UI (`/` → Register).

---

## 5. Run the app in development

Single command starts **Vite + React** and mounts **Express + API + Socket.io** on the same HTTP server:

```bash
npm run dev
```

or:

```bash
pnpm dev
```

- **Browser:** [http://localhost:8080](http://localhost:8080)
- **API quick check:** [http://localhost:8080/api/ping](http://localhost:8080/api/ping)
- **Doctors list:** [http://localhost:8080/api/doctors](http://localhost:8080/api/doctors)

If the terminal shows a MongoDB connection error, fix `MONGO_URI` and ensure MongoDB is listening before refreshing or restarting `npm run dev`.

---

## 6. Typical demo flow

1. Open [http://localhost:8080](http://localhost:8080) → **Register** a patient → **Dashboard** → **Book appointment** (pick a seeded doctor).
2. After booking, open **Track queue** (state is also stored in `sessionStorage` under `queue_ctx`).
3. In another browser/profile, **Login** as `dr.sarah@healthqueue.demo` / `Doctor123!` → **Queue control** → select doctor if admin → **Call next patient**.
4. Patient queue screen should update **without a full page refresh** (Socket.io).

---

## 7. Production build and run

Build the SPA and the Node server bundle:

```bash
npm run build
```

Start the production server (serves built SPA + API + websockets):

```bash
npm start
```

Ensure `.env` on the server includes `MONGO_URI`, `JWT_SECRET`, and optionally `PORT`.

---

## Troubleshooting

| Issue | What to check |
|--------|----------------|
| `MONGO_URI is not set` | `.env` exists at repo root and variable name is exact. Restart dev server after edits. |
| `ECONNREFUSED` / API errors | MongoDB not running or wrong host/port in `MONGO_URI`. |
| `JWT_SECRET is not set` | Add `JWT_SECRET` to `.env`. |
| Empty doctor list when booking | Run `npm run seed` with Mongo running. |
| Live queue not updating | Same origin (`localhost:8080`); patient must be logged in; staff must use **Queue control** with a valid JWT; check browser devtools Network/WebSockets. |
| CORS in odd setups | Dev uses permissive Socket.io CORS; production is same-origin by default. |

---

## Command reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development: Vite + Express + Socket.io |
| `npm run build` | Production build (client + server) |
| `npm start` | Run compiled server from `dist/` |
| `npm run typecheck` | TypeScript check |
| `npm run seed` | Idempotent DB seed for staff demo accounts |
| `npm test` | Vitest |

For stack conventions and folder layout, see [architecture.md](./architecture.md).
