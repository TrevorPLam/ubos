# UBOS

UBOS is a full-stack TypeScript app (React + Express) with a Postgres-backed API.

## Prerequisites

- **Node.js:** 20.x LTS recommended
- **Postgres:** running locally or reachable from your environment

## Quickstart

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables.

This repo does **not** auto-load a `.env` file at runtime. Use your shell/IDE to set env vars.
See `.env.example` for the full list.

**PowerShell (Windows):**

```powershell
$env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/ubos"
$env:PORT = "5000"
npm run dev
```

**bash/zsh (macOS/Linux):**

```bash
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/ubos"
export PORT="5000"
npm run dev
```

3. Run the app in development:

```bash
npm run dev
```

Open `http://localhost:5000`.

Tip: the app uses lightweight local auth. Visit `http://localhost:5000/api/login` to mint a dev user cookie.

## Common commands

- **Dev server (API + client via Vite middleware):** `npm run dev`
- **Typecheck:** `npm run check`
- **Production build (client + server):** `npm run build`
- **Run production bundle:** `npm start`

## Build output

- Client build: `dist/public/`
- Server bundle: `dist/index.cjs`

`npm start` runs `node dist/index.cjs` (make sure you’ve run `npm run build` first).

## Environment variables

Documented in `.env.example`.

- **Required**
  - `DATABASE_URL`: Postgres connection string used by the server.
- **Optional**
  - `PORT`: Port the server listens on (defaults to `5000`).
  - `NODE_ENV`: Set by scripts (`development` for `npm run dev`, `production` for `npm start`).

## Troubleshooting

- **“DATABASE_URL must be set”**
  - Set `DATABASE_URL` in your shell/IDE before running the server.
  - Confirm the database is reachable (host/port/credentials).

- **Port already in use**
  - Set `PORT` to another value (e.g. `5001`) and rerun.

- **Production server can’t find built assets**
  - If you see an error about a missing build directory, run `npm run build`.
  - Ensure `dist/public/` exists and is deployed alongside `dist/index.cjs`.

## Repo layout (high level)

- `client/` — React app (Vite root)
- `server/` — Express server + API routes + dev/prod client hosting
- `shared/` — Shared types/schema used by both client and server
- `script/build.ts` — Production build pipeline (Vite + esbuild)
- `tasks/` — File-based task workflow and backlogs
