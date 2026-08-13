# IICA Inventory

A self-hosted inventory management system for the IICA organisation. It tracks what the
organisation owns, where each item sits, what it is worth, and every movement in and out of the
store — with four levels of user access enforced on the server.

Built entirely on free, open-source tooling. There are no licences, no per-seat fees and no paid
third-party services: the whole system is a Next.js app plus a single SQLite file.

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

Requires **Node.js 20 or newer**.

```bash
npm install

# Create the database and the first administrator.
# Add --demo to also load a sample catalogue with movement history.
npm run seed -- --demo

npm run dev
```

Open <http://localhost:3000> and sign in.

### Default accounts created by the seed

| Account       | Email                     | Password     |
| ------------- | ------------------------- | ------------ |
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
npm run seed                    # first administrator only
npm run seed -- --demo          # administrator + demo catalogue and users
npm run seed -- --reset --demo  # delete the database and rebuild it
```

`--reset` permanently deletes `data/inventory.db`.

---

## Configuration

Copy `.env.example` to `.env.local`:

| Variable                | Required        | Purpose                                                     |
| ----------------------- | --------------- | ----------------------------------------------------------- |
| `AUTH_SECRET`           | in production   | Signs the session cookie. `openssl rand -hex 32`             |
| `DATA_DIR`              | no              | Where `inventory.db` lives. Defaults to `./data`             |
| `NEXT_PUBLIC_CURRENCY`  | no              | ISO 4217 code used for every valuation. Defaults to `USD`    |

In development a fallback secret is used so the app runs with no setup. In production the app
throws on startup if `AUTH_SECRET` is missing — this is deliberate.

## Running in production

```bash
npm run build
AUTH_SECRET=$(openssl rand -hex 32) npm run start
```

The app is a normal Node server, so it runs on anything that can run Node and keep a disk:
a spare office machine, a small VPS, Render, Railway, Fly.io, or a container.

Two things matter:

1. **`DATA_DIR` must be on persistent storage.** SQLite is a file. Platforms with ephemeral
   filesystems (Vercel, and most serverless hosts) will lose it on every deploy.
2. **Put it behind HTTPS.** Session cookies are marked `Secure` in production.

Back up by copying `data/inventory.db` — a plain file copy while the app is stopped, or
`sqlite3 data/inventory.db ".backup backup.db"` while it is running.

### Moving to a hosted database

Everything that touches the database goes through `src/lib/db.ts` and `src/lib/queries.ts`.
Swapping SQLite for Postgres (Supabase and Neon both have free tiers) means rewriting those two
files; nothing else in the app knows how the data is stored.

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
    db.ts                SQLite connection and migration
    schema.mjs           Table definitions (shared with the seed script)
    roles.ts             Roles and the permission matrix
    auth.ts              Session lookup, permission guards, audit writes
    queries.ts           Every read query
    password.ts          scrypt hashing
    session.ts           Signed session cookies
scripts/seed.mjs         Database bootstrap and demo data
```

## Security notes

- Passwords are hashed with scrypt and a per-user salt; comparison is constant-time
- Sessions are HS256-signed JWTs in an `httpOnly`, `sameSite=lax` cookie, valid for 8 hours
- Every request re-reads the account, so disabling a user takes effect immediately rather than
  when their session expires
- Every server action re-checks the caller's permission; the interface never grants access on its
  own
- All SQL uses bound parameters

## Built with

Next.js 16 (App Router, React Server Components) · React 19 · TypeScript · Tailwind CSS v4 ·
better-sqlite3 · jose · lucide-react. All MIT/Apache-licensed.
