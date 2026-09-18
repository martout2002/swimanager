# AGENTS.md

## Stack

Next.js 16 (App Router) + TypeScript, Drizzle ORM over postgres.js, plain CSS (no Tailwind), Bun as package manager and script runner. Deploys to Vercel; prod DB is Supabase (transaction pooler, `prepare: false`).

## Commands

```bash
bun install                   # install deps
bun run dev                   # next dev
bun run build                 # next build
bun run typecheck             # tsc --noEmit
bun run lint                  # next lint
bun run check                 # assertion self-check (credit, billing, progress rules)
bun run db:up                 # start local Postgres via Docker (port 5433)
bun run db:down               # stop it
bun run db:push               # apply sql/schema.sql to local DB
bun run db:seed               # wipe + re-seed the demo school
bun run db:reset              # db:push then db:seed
```

- `bun run check` is the closest thing to a test suite. Run it after changing business logic in `src/lib/swim.ts`, `src/lib/school.ts`, or `src/lib/curriculum.ts`.
- `db:push` refuses non-local databases unless you pass `--force` (the DDL drops legacy tables).
- There are no unit test frameworks (no vitest/jest). The check script uses `node:assert`.

## Architecture

Single-page-per-role app. Three views behind one shared dataset.

| Path | Role | Notes |
|---|---|---|
| `/instructor` | instructor | Phone-shaped calendar flow |
| `/parent` | parent | Tabs per child |
| `/owner` | owner | Desktop dashboard |

Key wiring:

- **`src/proxy.ts`** — exported as the Next.js middleware (`middleware.ts` does not exist as a file; `proxy` is the middleware function). JWT cookie check + role-based routing. Every role sees exactly one path; everything else redirects.
- **`src/lib/data.ts`** — `loadSchool()` fetches every table in parallel. All three views call this single function; there is no per-component data fetching.
- **`src/lib/actions.ts`** — every write is a `'use server'` action. Actions call `revalidatePath('/')` so all views update.
- **`src/lib/swim.ts`** — date helpers, billing rules, credit logic, progress maths.
- **`src/lib/school.ts`** — derived reads (invoices, rosters, eligible slots) from the `School` type returned by `loadSchool()`.
- **`src/lib/curriculum.ts`** — the 11-level syllabus (Foundation 1-5, Stage 1-3, Bronze/Silver/Gold). Lives in code, not the DB.
- **`src/db/schema.ts`** — Drizzle schema. Must stay in sync with `sql/schema.sql` (the DDL is the source of truth).
- **`sql/schema.sql`** — idempotent DDL applied by `db:push`. Drops legacy v1 tables.

## Gotchas

- **The clock is pinned to `2026-08-29`.** The constant `TODAY` in `src/lib/swim.ts` drives all date logic. All seeded data is in August 2026. Do not use `new Date()` for business logic.
- **No middleware.ts file.** The middleware is `src/proxy.ts` exporting `proxy` as the handler and a `config` with a matcher. If Next.js middleware conventions change, this is the file to update.
- **`src/db/index.ts` uses a lazy Proxy.** The DB connection is created on first property access so `next build` works without a database. Do not eagerly import and call the connection at module scope outside of server actions/routes.
- **`prepare: false` on all postgres connections.** Required for Supabase's transaction pooler. Do not add prepared statements.
- **Two schema sources.** `sql/schema.sql` is the DDL source of truth. `src/db/schema.ts` is the Drizzle mirror for the ORM. Both must be updated together.
- **Progress is one `jsonb` column** on `students`. The stage tree is read/written whole; there are no join tables for criteria.
- **Single school, no tenant column.** No multi-tenancy.
- **`force-dynamic` on the views layout** (`src/app/(views)/layout.tsx`). All view pages are server-rendered on every request.

## Style

- Plain CSS in `src/app/globals.css` with CSS custom properties. Components use class names directly (no CSS modules, no Tailwind).
- `clsx` for conditional class names.
- `@/*` path alias maps to `./src/*`.
- Fonts: Bricolage Grotesque (display) and Inter (body), loaded via `next/font/google`.

## Auth

JWT in HTTP-only cookie (`swm_session`), signed with `AUTH_SECRET` (env var). 30-day expiry. No signup, no password reset, no email verification — accounts come from the seed script. The session carries `role` and `parentName`.

## Demo accounts

All seeded with password `swim1234`. See `scripts/seed.ts` or the login page for the full list.
