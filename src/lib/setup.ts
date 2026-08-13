import "server-only";
import { sql } from "./db";
import { SCHEMA_SQL } from "./schema.mjs";

/**
 * Creating the tables is idempotent (`CREATE TABLE IF NOT EXISTS`), but there is
 * no reason to send the DDL on every request — cache the promise per process.
 */
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  schemaReady ??= sql.unsafe(SCHEMA_SQL).then(
    () => undefined,
    (error) => {
      // Let the next request retry rather than caching a failure forever.
      schemaReady = null;
      throw error;
    },
  );
  return schemaReady;
}

/**
 * True when the database has no accounts at all, which is the only state in
 * which the first-run setup screen is allowed to do anything.
 */
export async function needsSetup(): Promise<boolean> {
  await ensureSchema();
  const [row] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM users`;
  return row.n === 0;
}
