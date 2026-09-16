# swiManager

SwimSafer progress tracking, scheduling and billing for a small swim school. Three views
over **one shared dataset** — mark attendance as the Instructor, then look at
Owner → Billing or the Parent portal and watch it flow through.

- **Next.js 15** (App Router) + **TypeScript**, server actions for every write
- **Postgres** via **Drizzle ORM** (`postgres.js` driver) — local Docker for dev, Supabase for prod
- Email + password auth, signed HTTP-only cookie, 30-day session, role on the session
- Deploys to **Vercel** as-is

## The three views

Each account has exactly one role, and each role has exactly one view. Signing in lands
you on yours; anything else redirects back to it.

### Instructor — `/instructor`
A phone-shaped flow: **month calendar → a day's classes → the class roster → assess a
student**. On the roster, one tap per student sets attendance from six statuses
(Present / Notified / No-show / Cancelled (me) / Weather / Make-up). On the assessment
screen, official SwimSafer criteria are locked and only tick when their coaching
breakdown is complete; plain criteria tick directly; timed swims pass or fail on the
recorded time. When every criterion in the stage is achieved a **Ready for assessment**
banner appears, gated behind an explicit "Record pass" confirmation — and one promotion
can be undone exactly, restoring the old progress tree.

### Parent — `/parent`
One tab per child, then three sub-tabs:
- **Progress** — a ring, what the child has nailed, what's next, their make-up credits, and the month's invoice with a Pay-now QR.
- **All stages** — the full Foundation 1-5 → Stage 1-3 → Bronze / Silver / Gold roadmap, with the school's own levels flagged as not SwimSafer-official.
- **Book a slot** — the coach's week. Free cells are bookable against an available credit.

### Owner — `/owner`
A desktop dashboard: **Overview** (KPIs, promotions, the week), **Roster**, **Billing**
(generate invoices from actual attendance, mark paid), **Curriculum** (every level,
read-only), **Venues** (pool profiles), **Classes** (capacity, level bands, blocked
dates), and **Schedule** (paint hourly make-up availability that parents book into).

## How the money and make-ups work

| Status | Billed? | Earns a make-up credit? |
| --- | --- | --- |
| Present | yes | no |
| No-show | yes | no |
| Notified absence | no | yes |
| Cancelled (instructor) | no | yes |
| Weather | no | yes |
| Make-up | no | no |

At most **one credit per student per calendar month**, each valid for **two months**.
Correcting a mis-marked absence back to Present hands the credit back, as long as it
has not been spent. Invoices are generated from attendance rows — nothing is estimated.

A credit can be spent two ways: into an existing class that serves the child's level and
has a free seat, or into an hourly slot the coach has painted free on the Schedule grid
(those are 1:1, so any level can take one). Blocked dates are excluded from both.

## Running it locally

You need Docker (for Postgres) and [Bun](https://bun.com) 1.2+.

```bash
bun install
cp .env.example .env          # then set AUTH_SECRET
bun run db:up                       # Postgres on localhost:5433
bun run db:reset                    # apply the schema, then seed the demo school
bun run dev
```

`AUTH_SECRET` can be anything over 16 characters — `openssl rand -base64 48`.

The container listens on **5433**, not 5432, so it cannot collide with a Postgres you
already have running.

| Command | What it does |
| --- | --- |
| `bun run db:up` / `db:down` | start / stop the local Postgres container |
| `bun run db:push` | apply `sql/schema.sql` |
| `bun run db:seed` | wipe and re-seed the demo school |
| `bun run db:reset` | both of the above |
| `bun run check` | assertion self-check on the credit, billing and progress rules |
| `bun run typecheck` | `tsc --noEmit` |

### Demo accounts

`bun run db:seed` creates these, all with the password **`swim1234`**. They are also
listed on the sign-in page under "Demo accounts" — **delete that block before real
families use this.**

| Role | Email |
| --- | --- |
| Owner | `owner@swimanager.test` |
| Instructor | `lincoln@swimanager.test` |
| Parent (Ella, Oli) | `aileen@swimanager.test` |
| Parent (Kai Hsu, Kai Yang) | `fiona@swimanager.test` |
| Parent (Oscar) | `wang@swimanager.test` |
| Parent (Anna) | `matija@swimanager.test` |

### Try the shared dataset

1. Sign in as the instructor, open **Sat 29 Aug 2026**, tap into a class, mark everyone.
2. Sign in as the owner → **Billing** → generate invoices. The totals come from step 1.
3. Sign in as that family's parent → the same invoice, and a make-up credit if you marked a notified absence.

## Deploying to Supabase + Vercel

1. Create a Supabase project. **Project Settings → Database → Connection string →
   Transaction pooler** (port `6543`), append `?sslmode=require`. Use the pooler host,
   not `db.<ref>.supabase.co` — the app sets `prepare: false` because the pooler does not
   support prepared statements.
2. Apply the schema once: `DATABASE_URL="<supabase url>" bun run db:push --force`.
   The `--force` is required because `db:push` refuses to touch a non-local database on
   its own; the schema drops the v1 tables.
3. `bunx vercel`, then add `DATABASE_URL` and `AUTH_SECRET` under **Settings →
   Environment Variables** for Production, Preview and Development, and redeploy.

`AUTH_SECRET` must be identical everywhere or sessions silently fail to verify.

## Layout

```
sql/schema.sql               DDL, idempotent, source of truth for the database
scripts/check.ts             assertion self-check for the non-obvious rules
scripts/seed.ts              the demo school: accounts, students, classes, attendance
src/lib/curriculum.ts        the 11 levels and their criteria, plus pool profiles
src/lib/swim.ts              dates, progress maths, billing rules, credit rules
src/lib/school.ts            derived reads over the loaded dataset (invoices, rosters, eligible slots)
src/lib/data.ts              loadSchool() — every read the views do
src/lib/actions.ts           every write, as server actions
src/app/(views)/             the three signed-in views
src/middleware.ts            cookie check and role routing
```

## Things worth knowing

- **The clock is fixed at 2026-08-29.** All the seeded attendance sits in August 2026, so
  a fixed "today" keeps it current instead of stranding it in the past. It is one
  constant, `TODAY` in `src/lib/swim.ts`.
- **The curriculum lives in code**, not the database. The Curriculum screen is read-only;
  move the templates into Postgres when the owner needs to edit them.
- **Progress is one `jsonb` column per student.** The stage tree is only ever read and
  written whole, so it does not earn a set of join tables.
- **Single school, no tenant column.** The owner is the coach. Add a `coach_id` if a
  second school ever signs up.
- **The Pay-now QR is a placeholder pattern, not a scannable PayNow code.** It needs the
  coach's UEN and a real SGQR payload.
- **Data decisions carried over from the spreadsheets:** the two source sheets disagreed
  on some students' levels, and the criteria come from the checklist docx, whose timed
  swims sit one stage lower than the xlsx has them (50 m FC ≤1:30 at Silver, 100 m FC
  ≤3:00 at Gold). Foundation 1-5 is the school's own progression, flagged in the UI as
  not SwimSafer-official. Worth checking against the instructor manual.
- Sessions are a signed JWT in an HTTP-only cookie, checked in middleware. There is no
  password reset, email verification, or signup — accounts come from the seed script.
- Every route handler is gone; writes are server actions that re-validate the whole tree,
  so all three views see a change immediately.
