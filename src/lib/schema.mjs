/**
 * The single source of truth for the database shape (PostgreSQL).
 * Plain JavaScript so both the app (TypeScript) and `npm run seed` (Node) can use it.
 */
export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'VIEWER',
    status        TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS locations (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS items (
    id           SERIAL PRIMARY KEY,
    sku          TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    description  TEXT,
    category_id  INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    location_id  INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    unit         TEXT NOT NULL DEFAULT 'unit',
    quantity     INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    supplier     TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS movements (
    id            SERIAL PRIMARY KEY,
    item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    type          TEXT NOT NULL,
    quantity      INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    user_label TEXT,
    action     TEXT NOT NULL,
    entity     TEXT NOT NULL,
    entity_id  TEXT,
    details    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_items_category  ON items(category_id);
  CREATE INDEX IF NOT EXISTS idx_items_location  ON items(location_id);
  CREATE INDEX IF NOT EXISTS idx_movements_item  ON movements(item_id);
  CREATE INDEX IF NOT EXISTS idx_movements_date  ON movements(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_date      ON audit_logs(created_at);
`;
