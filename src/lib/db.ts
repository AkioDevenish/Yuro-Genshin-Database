import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema.mjs";

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

const DB_FILE = path.join(DATA_DIR, "inventory.db");

function createConnection() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(db: Database.Database) {
  db.exec(SCHEMA_SQL);
}

// Next.js dev mode re-evaluates modules on every hot reload; cache the handle on
// globalThis so we never open more than one connection per process.
const globalForDb = globalThis as unknown as { __iicaDb?: Database.Database };

export const db: Database.Database = globalForDb.__iicaDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__iicaDb = db;
}
