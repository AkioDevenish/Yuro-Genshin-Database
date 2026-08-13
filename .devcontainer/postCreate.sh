#!/usr/bin/env bash
# Runs once when the Codespace is created. Everything the app needs to be
# usable — dependencies, database tables, demo data, an admin account — is set
# up here so that opening the forwarded port just works.
set -euo pipefail

echo "──> Installing dependencies"
npm install --no-audit --no-fund

echo "──> Waiting for PostgreSQL"
for attempt in $(seq 1 30); do
  if node -e "
    const postgres = require('postgres');
    const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
    sql\`SELECT 1\`.then(() => sql.end()).then(() => process.exit(0)).catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "    database is up"
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "    database did not become ready in time" >&2
    exit 1
  fi
  sleep 2
done

echo "──> Creating tables, an administrator and demo data"
npm run seed -- --demo

cat <<'BANNER'

  ╭──────────────────────────────────────────────────────────────╮
  │  IICA Inventory is ready.                                    │
  │                                                              │
  │  The app starts automatically. When the "Open in Browser"    │
  │  prompt appears for port 3000, open it — or use the PORTS    │
  │  tab and click the port 3000 globe icon.                     │
  │                                                              │
  │  Sign in as:                                                 │
  │    admin@iica.org  /  ChangeMe123        (Administrator)     │
  │    marisol.rivera@iica.org / Manager123  (Manager)           │
  │    daniel.okoye@iica.org / Staff12345    (Staff)             │
  │    priya.raman@iica.org / Viewer1234     (Viewer)            │
  │                                                              │
  │  Sign in as each to see how the access levels differ.        │
  ╰──────────────────────────────────────────────────────────────╯

BANNER
