# IICA Inventory

A self-hosted inventory management system for the IICA organisation. It tracks what the
organisation owns, where each item sits, what it is worth, and every movement in and out of the
store — with four levels of user access enforced on the server.

Built entirely on free, open-source tooling. There are no licences and no per-seat fees: the
system is a Next.js app on top of PostgreSQL, and it deploys to Vercel's free tier with a free
Neon or Supabase database.

---

## Features

**Inventory**
- Item catalogue with SKU / asset code, category, location, unit of measure, minimum level,
  unit cost and supplier
- Search across name, SKU, supplier and notes, plus filters for category, location and stock level
- Sort by name, lowest stock, highest value or most recently updated
- CSV export that respects whatever filters are applied

**Stock control**
- Three movement types: **Receive** (stock in), **Issue** (stock out) and **Correct** (set the
  balance to a counted figure)
- Item balances update atomically with the movement, inside a transaction
- Issuing more than is on hand is rejected with a clear message
- Every movement stores the running balance, the note and who recorded it — the history is
  append-only

**Reporting**
- Dashboard with total valuation, units held, low-stock and out-of-stock counts
- 14- and 30-day inbound/outbound movement charts (rendered as plain SVG — no charting library)
- Value broken down by category and by location
- Highest-value items

**Administration**
- User accounts with four access levels
- Password resets, account disabling and deletion
- The system refuses to leave itself without an active administrator
- Append-only audit trail of sign-ins, stock movements and every create / update / delete

## Access levels

Permissions are checked on the server in every page and every action — hiding a button is never
the only defence.

| Permission                     | Administrator | Manager | Staff | Viewer |
| ------------------------------ | :-----------: | :-----: | :---: | :----: |
| View inventory                 |       ●       |    ●    |   ●   |   ●    |
| View reports and exports       |       ●       |    ●    |   ●   |   ●    |
| Record stock movements         |       ●       |    ●    |   ●   |   —    |
| Create, edit and delete items  |       ●       |    ●    |   —   |   —    |
| Manage categories & locations  |       ●       |    ●    |   —   |   —    |
| Manage user accounts           |       ●       |    —    |   —   |   —    |
| View the audit trail           |       ●       |    —    |   —   |   —    |

The matrix lives in one place — `src/lib/roles.ts`. Adding a role or a permission means editing
that file and nothing else.

---

## Getting started

Requires **Node.js 20 or newer** and a PostgreSQL database.

Free PostgreSQL hosting, no card required:
- [neon.tech](https://neon.tech) — create a project, copy the connection string
- [supabase.com](https://supabase.com) — Project Settings → Database → Connection string

```bash
npm install
cp .env.example .env.local
```

Put your connection string and a session secret in `.env.local`:

```
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
AUTH_SECRET=<output of: openssl rand -hex 32>
```

Then create the tables and the first administrator:

```bash
npm run seed -- --demo   # drop --demo for an empty catalogue
npm run dev
```

Open <http://localhost:3000> and sign in.

### Default accounts created by the seed

| Account       | Email                     | Password      |
| ------------- | ------------------------- | ------------- |
| Administrator | `admin@iica.org`          | `ChangeMe123` |
| Manager       | `marisol.rivera@iica.org` | `Manager123`  |
| Staff         | `daniel.okoye@iica.org`   | `Staff12345`  |
| Viewer        | `priya.raman@iica.org`    | `Viewer1234`  |

The demo accounts are only created with `--demo`. **Change the administrator password before
anyone else uses the system**, or set your own from the start:

```bash
ADMIN_EMAIL=you@iica.org ADMIN_PASSWORD='a strong password' npm run seed
```

### Seed options

```bash
npm run seed                    # create the schema and the first administrator
npm run seed -- --demo          # also load a demo catalogue and one user per role
npm run seed -- --reset --demo  # DROP every table and rebuild from scratch
```

`--reset` permanently deletes all data.

---

## Configuration

| Variable               | Required      | Purpose                                                  |
| ---------------------- | ------------- | -------------------------------------------------------- |
| `DATABASE_URL`         | yes           | PostgreSQL connection string                              |
| `AUTH_SECRET`          | in production | Signs the session cookie. `openssl rand -hex 32`          |
| `NEXT_PUBLIC_CURRENCY` | no            | ISO 4217 code used for every valuation. Defaults to `USD` |

`POSTGRES_URL` is accepted as an alias for `DATABASE_URL`, which is what Vercel's Postgres and
Neon integrations set automatically.

In development a fallback session secret is used so the app runs with no setup. In production the
app throws on startup if `AUTH_SECRET` is missing — this is deliberate.

## Deploying to Vercel

1. Push this repository to GitHub and import it at [vercel.com/new](https://vercel.com/new).
2. Add a database: **Storage → Create Database → Neon (Postgres)**, or paste an existing
   `DATABASE_URL` under **Settings → Environment Variables**.
3. Add `AUTH_SECRET` as an environment variable (`openssl rand -hex 32`).
4. Deploy.
5. Create the tables and your administrator account by running the seed once against the same
   database from your own machine:

   ```bash
   DATABASE_URL='<the same connection string>' \
   ADMIN_EMAIL=you@iica.org ADMIN_PASSWORD='a strong password' npm run seed
   ```

Use the **pooled** connection string on Vercel — Neon's `-pooler` host, or Supabase port `6543`.
Serverless functions open many short-lived connections, and a direct connection will hit the
server's connection limit under load. The app already sets `max: 1` per instance and disables
named prepared statements so it works behind a transaction-mode pooler.

## Running anywhere else

It is a normal Node server, so it also runs on Render, Railway, Fly.io, a VPS, or an office
machine:

```bash
npm run build
AUTH_SECRET=... DATABASE_URL=... npm run start
```

Put it behind HTTPS — session cookies are marked `Secure` in production.

Back up with `pg_dump`; most hosted providers also take automatic snapshots on their free tier.

---

## Project structure

```
src/
  app/
    (auth)/login/        Sign-in page and the login/logout actions
    (app)/               Everything behind authentication
      dashboard/         Live stock position
      inventory/         Catalogue, item detail, create/edit/delete
      movements/         Receive, issue and correct stock
      categories/        Item grouping
      locations/         Stores and sites
      reports/           Valuation and distribution analysis
      users/             Accounts and access levels
      audit/             Append-only activity log
      profile/           Own details and password
    api/export/          CSV export endpoint
  components/            Shared interface pieces
  lib/
    db.ts                PostgreSQL client
    schema.mjs           Table definitions (shared with the seed script)
    roles.ts             Roles and the permission matrix
    auth.ts              Session lookup, permission guards, audit writes
    queries.ts           Every read query
    password.ts          scrypt hashing
    session.ts           Signed session cookies
scripts/seed.mjs         Schema creation, first administrator, demo data
```

## Security notes

- Passwords are hashed with scrypt and a per-user salt; comparison is constant-time
- Sessions are HS256-signed JWTs in an `httpOnly`, `sameSite=lax` cookie, valid for 8 hours
- Every request re-reads the account, so disabling a user takes effect immediately rather than
  when their session expires
- Every server action re-checks the caller's permission; the interface never grants access on its
  own
- All SQL uses bound parameters
- Stock movements lock the item row (`SELECT … FOR UPDATE`) so two people moving the same item
  cannot race each other into a wrong balance

## Built with

Next.js 16 (App Router, React Server Components) · React 19 · TypeScript · Tailwind CSS v4 ·
PostgreSQL via postgres.js · jose · lucide-react. All MIT/Apache-licensed.
