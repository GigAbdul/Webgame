# DashForge

DashForge is a full-stack browser game inspired by Geometry Dash-style auto-runner gameplay, built as a production-structured MVP for demos, coursework, and Railway deployment.

It includes:

- browser gameplay with official levels
- PostgreSQL-backed persistence with Prisma
- JWT auth with `USER` and `ADMIN` roles
- a built-in level editor using the same level JSON format as gameplay
- admin moderation and official publishing workflow
- first-clear star rewards for official levels only
- a leaderboard ranked by total earned stars

## Architecture

Chosen architecture:

- `client`: React + TypeScript + Vite + Tailwind + TanStack Query + Zustand
- `server`: Express + TypeScript + Prisma + PostgreSQL + Zod + JWT
- rendering: custom HTML5 Canvas runtime shared conceptually between gameplay and editor
- deployment model: one app service plus one PostgreSQL service, with the backend serving the built frontend in production

Why custom Canvas instead of Phaser:

- it keeps the editor and runtime tightly aligned around the same typed level JSON
- it reduces framework overhead for a one-week MVP
- it still delivers real gameplay, test play, and browser-based level editing end to end

## Feature Set

### Player

- register and log in
- browse official levels
- play official levels in the browser
- earn stars only on first successful completion of official levels
- view personal profile stats and reward history
- create draft levels in the editor
- update and submit draft levels for admin review

### Admin

- log in with a seeded admin account
- review all levels, including submitted user content
- create official levels directly from scratch
- update official settings separately from normal editor flow
- publish levels as official, archive them, and recalculate rewards when stars change
- browse basic user stats

### Gameplay

- auto-run cube gameplay
- jump on `Space`, mouse click, or tap
- spikes, pads, orbs, gravity portals, speed portals, finish portals
- attempt counter, progress tracking, quick retry flow

### Editor

- desktop-first canvas editor
- object palette
- click-to-place workflow
- selection and dragging
- delete and duplicate
- pan and zoom
- undo and redo
- inspector for object geometry and props JSON
- inline test play using the same level data contract

## Business Rules

These rules are implemented in backend services and tested around the highest-risk logic:

- leaderboard ranking is based on `totalStars`
- only `OFFICIAL` levels award stars
- a user receives stars only once per official level
- stars are never calculated from the client
- only admins can publish official levels
- only admins can set `starsReward`
- `starsReward` exists only in admin official settings, never in the regular user editor
- changing `starsReward` updates reward records and resyncs impacted user totals
- archived levels disappear from the public catalog, but earned stars remain

## Project Structure

```text
client/
  src/
    app/
    components/
    features/
      auth/
      game/
      editor/
      levels/
      leaderboard/
      admin/
    pages/
    routes/
    services/
    store/
    types/
    utils/
    styles/
server/
  src/
    app/
    config/
    middleware/
    modules/
      auth/
      users/
      levels/
      admin/
      game/
      leaderboard/
    lib/
    utils/
  tests/
prisma/
  migrations/
  schema.prisma
  seed.ts
.env.example
docker-compose.yml
Dockerfile
package.json
```

## Level Data Format

Levels are stored in PostgreSQL as JSON and use logical grid units instead of raw pixels.

Core shape:

```json
{
  "meta": {
    "gridSize": 32,
    "lengthUnits": 180,
    "theme": "aurora-grid",
    "background": "city-neon",
    "music": "placeholder-track-01",
    "version": 1
  },
  "player": {
    "startX": 2,
    "startY": 8,
    "mode": "cube",
    "baseSpeed": 1.1,
    "gravity": 1
  },
  "objects": [],
  "finish": {
    "x": 47,
    "y": 2
  }
}
```

Supported object types:

- `GROUND_BLOCK`
- `PLATFORM_BLOCK`
- `SPIKE`
- `JUMP_PAD`
- `JUMP_ORB`
- `GRAVITY_PORTAL`
- `SPEED_PORTAL`
- `FINISH_PORTAL`
- `DECORATION_BLOCK`
- `START_MARKER`

## Seeded Demo Content

The seed script creates:

- admin account
- 2 normal users
- 2 official sample levels
- 1 submitted user level
- demo reward rows to populate the leaderboard

Default admin credentials:

- email: `admin@example.com`
- password: `Admin123!`
- username: `admin`

Demo users:

- `nova@example.com` / `Player123!`
- `pulse@example.com` / `Player123!`

These credentials are for demo use only and must be changed in production.

## Environment Variables

Copy `.env.example` to `.env` and adjust values as needed.

Required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `CLIENT_ORIGIN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_USERNAME`

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 3. Generate Prisma client

```bash
npm run prisma:generate
```

### 4. Run migrations

For interactive local development:

```bash
npm run prisma:migrate -- --name init
```

For applying committed migrations:

```bash
npm run prisma:deploy
```

### 5. Seed demo data

```bash
npm run seed
```

### 6. Start the app

```bash
npm run dev
```

Development URLs:

- client: `http://localhost:5173`
- server: `http://localhost:4000`

The Vite dev server proxies `/api` requests to the backend automatically.

## Scripts

- `npm run dev` - start client and server together
- `npm run dev:client` - run Vite client only
- `npm run dev:server` - run Express server only
- `npm run build` - build client and server
- `npm run start` - start the built server
- `npm run lint` - lint client and server
- `npm test` - run server tests
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:migrate` - run Prisma migrate dev
- `npm run prisma:deploy` - apply committed migrations
- `npm run seed` - seed demo content

## Testing and Verification

Critical verification currently covers:

- auth payload validation
- admin-only role protection
- official-only reward rule
- single reward per user per official level
- leaderboard sort order
- official settings validation

Run:

```bash
npm run lint
npm test
npm run build
```

## Editor Workflow

Regular user flow:

1. Open `/editor/new`
2. Build a draft level on the grid
3. Save draft to PostgreSQL
4. Re-open and continue editing through `/editor/:id`
5. Submit the draft for review

Admin flow:

1. Open `/admin/create-official`
2. Build an admin-owned draft
3. Save and open the admin detail page
4. Configure difficulty, `starsReward`, visibility, and official status
5. Publish as `OFFICIAL`

## Admin Moderation Workflow

Workflow A: admin creates official content directly

1. Build a level from scratch
2. Save draft
3. Apply official settings
4. Publish as `OFFICIAL`

Workflow B: user submission becomes official

1. User creates a draft
2. User submits it
3. Admin reviews in `/admin/levels`
4. Admin edits if needed
5. Admin sets difficulty and `starsReward`
6. Admin publishes it as `OFFICIAL`

## Stars and Leaderboard Logic

- official gameplay creates a server-side game session
- completion requests are validated against the session and level state
- rewards are granted transactionally
- `LevelReward` enforces one reward per user per level
- user `totalStars` and `completedOfficialLevels` are synced from reward records
- leaderboard order is:
  1. `totalStars DESC`
  2. `completedOfficialLevels DESC`
  3. `username ASC`

## Deploy to Railway

Recommended Railway setup:

1. Create a new Railway project.
2. Add a PostgreSQL service.
3. Add one app service from this repository.
4. Set the required environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `PORT`
   - `NODE_ENV=production`
   - `CLIENT_ORIGIN` if needed
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_USERNAME`
5. Use the app service build command:

```bash
npm install
npm run prisma:generate
npm run build
```

6. Use the app service start command:

```bash
npm run start
```

7. Apply migrations on Railway:

```bash
npm run prisma:deploy
```

8. Seed demo data if desired:

```bash
npm run seed
```

Because the Express server serves the built Vite app in production, a single application service is enough.

## Docker

`docker-compose.yml` is intended for local PostgreSQL only.

`Dockerfile` builds the monorepo, generates Prisma client, builds client + server, and starts the backend in production mode.

## Known Tradeoffs

- no full anti-cheat system; only practical MVP integrity checks are included
- no full version-history model for levels yet
- editor is desktop-first; mobile support is focused on gameplay, not authoring
- reward and stat resync is implemented directly in services instead of through background jobs
- no guest-mode persistence

## Status

Current repository status:

- lint passes
- tests pass
- production build passes
- Prisma schema, seed, and committed migration are included
- Docker Compose and Railway deployment files are present
