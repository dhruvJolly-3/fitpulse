# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Install all dependencies (server, client)
npm run install:all

# Run both server + client concurrently
npm run dev

# Run server only (nodemon, port 5001)
npm run dev:server

# Run client only (CRA dev server, port 3000)
npm run dev:client

# Production server
npm start

# Production client build (Vercel runs with CI=true, so ESLint warnings fail the build)
cd client && CI=true npm run build
```

### Env setup
```bash
cp server/.env.example server/.env
# Required: MONGODB_URI (MONGO_URI also accepted), JWT_SECRET
# Optional: PORT (default 5001), CORS_ORIGINS, NODE_ENV
```
The client needs no env for local dev — it falls back to `http://localhost:5001`. See `client/.env.example`.

**Never commit a real `.env`.** The root `.gitignore` ignores `.env` and `.env.*` everywhere except `.env.example`.

No test suite exists. No lint config beyond CRA's built-in ESLint.

## Architecture

MERN stack. `server/` and `client/` are separate npm packages under the repo root; `concurrently` runs both from the root.

### Server (`server/`)
Express 4 API. MongoDB via Mongoose. JWT auth middleware (`middleware/auth.js`) attaches `req.user` on every protected route.

**Request pipeline (`index.js`):**
1. Boot-time env guard — exits with a named error if `MONGODB_URI`/`MONGO_URI` or `JWT_SECRET` is missing.
2. CORS allowlist — `http://localhost:3000` and `http://127.0.0.1:3000` always allowed, plus comma-separated `CORS_ORIGINS`. Other origins get 403.
3. Routes under `/api/*`, plus `GET /api/health` (200 when DB connected, 503 otherwise — used by Render's health check).
4. `notFound` → `errorHandler` (`middleware/errorHandler.js`), always last.

**Route conventions — follow these when adding routes:**
- Wrap async handlers in `asyncHandler` (`utils/asyncHandler.js`) and let errors throw. Don't write per-route try/catch returning 500; the central `errorHandler` maps Mongoose ValidationError/CastError → 400, duplicate key → 409, and hides 5xx messages in production.
- Validate input with express-validator via `validate([...rules])` from `middleware/validate.js`. Shared rules: `dateParam()`, `dateBody()`, `startDateQuery()`, `mongoIdParam(name)`. Dates are `YYYY-MM-DD` strings. Failures respond `400 { message, errors: [{ field, message }] }`.
- When spreading `req.body` into a document, put `user: req.user._id` **after** the spread so a client can't write to another user's data.
- Error responses are always `{ message }` — the client reads `err.response.data.message`.

**Models:**
- `User` — profile, TDEE/BMR/macro targets, per-user daily targets (water/steps/sleep). TDEE via Mifflin-St Jeor in `User.calculateTDEE()`. Macros auto-set (30% protein / 40% carbs / 30% fat). `PUT /user/profile` only accepts whitelisted fields.
- `NutritionLog` — daily food entries keyed by date + user.
- `Training` — workout programs and workout logs with streak tracking. Programs are generated client-side by fixed rules from goal + diet (not AI); exercise categories include `push`/`pull`/`legs`/`core` for muscle-gain splits.
- `Metrics` — `SleepLog`, `WaterLog`, `StepsLog` (routers in `routes/metrics.js`, re-exported by `water.js`/`sleep.js`/`steps.js`). Each has `GET /history/week?startDate=`.

### Client (`client/`)
Create React App (not Vite). React Router v6. No Redux — global state is `AuthContext` only.

**Key patterns:**
- `AuthContext` (`src/context/AuthContext.js`) exports both the context and a named `api` axios instance. **All pages import `api` from `AuthContext`** — never create a new axios instance.
- `api` base URL = `${REACT_APP_API_URL || 'http://localhost:5001'}/api`. `REACT_APP_API_URL` is the backend origin (no `/api`, no trailing slash) and is inlined at **build** time — changing it on Vercel requires a redeploy.
- JWT stored in `localStorage` as `fp_token`. Interceptor attaches `Authorization: Bearer`.
- `AppShell` wraps all authenticated routes.
- Routing: unauthenticated → `/auth`, authenticated but no `profile.age` → `/onboarding`, otherwise dashboard + nested routes.
- Never display invented numbers or placeholder data — every figure on screen comes from the API or the user's own targets.

### Design system
Source of truth: `design/FitPulse App.html` and `design/DESIGN.md` in the handoff folder. Implemented in `client/src/index.css`.

- **Palette (CSS vars on `:root`):** cream canvas `--cream #f1ebde`, cards `--paper`, wells `--bone`, obsidian `--ink #0e0e10` (+ `--ink-50/30/15/08` tints, `--line` hairline), matcha `--matcha #c9e265` / `--matcha-2` / `--matcha-d` (small text on cream), coral `--coral #ff5b3d` for alerts, "today", and below-target states.
- **Fonts** (Google Fonts in `public/index.html`): Bricolage Grotesque (`--display`, headlines/numerals), Instrument Serif italic (`--serif`, one accent word via `.serif-it`), Inter Tight (`--body`), JetBrains Mono (`--mono`, labels via `.label`).
- **Layout:** 248px obsidian rail + cream main column; rail collapses to a 76px icon strip ≤920px; bottom tab bar ≤600px. Pages use `.page-header` + `.page-body`, with `.grid.g-12` and `.span-4/5/7/8` for the editorial grid (folds to one column ≤920px).
- **Components:** `.card` (flat, 20px radius, hairline, no shadows) with `.dark` / `.lime` variants; `.btn` pills (`.primary` ink→coral hover, `.lime`, `.ghost`, `.danger`, `.sm`, `.block`); `.pill` (`.matcha/.ink/.coral/.out`); `.stat-tile` (`.k` label / `.v` numeral / `.d` detail); `.bar` meters; `.chip`/`.seg`/`.option` for choices; `.field` forms; `.exo` exercise rows; `.heatmap`; `.tbl`; `.modal`.
- **Shared components:** `components/Ring.js` (progress ring), `components/WeekBars.js` (7-day Recharts bars — today coral, target met matcha; animation disabled because Recharts 2.x mis-positions bars when data loads after an empty first render). Chart colours come from `src/theme.js` since Recharts props can't use CSS vars.

### Deployment
- **Server → Render**, defined in `render.yaml` (Blueprint): `rootDir: server`, `npm ci` / `npm start`, health check `/api/health`. Env: `MONGODB_URI` (set in dashboard), `JWT_SECRET` (generated by Render), `CORS_ORIGINS` (the Vercel URL), `NODE_ENV=production`. `PORT` is injected by Render.
- **Client → Vercel** (`https://fitpulse-ruddy.vercel.app`), config in `client/vercel.json` (CRA build + SPA rewrite to `index.html`). Dashboard Root Directory = `client`; env `REACT_APP_API_URL` = the Render service URL.
- Deploy order: backend first → frontend with backend URL → set `CORS_ORIGINS` on backend to the frontend URL.
- Render free tier sleeps after ~15 min idle; first request can take 30–50s.
