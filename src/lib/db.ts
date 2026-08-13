import postgres from "postgres";

function connectionString(): string {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL || // set automatically by Vercel Postgres / Neon integrations
    "";

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Point it at your PostgreSQL database, e.g.\n" +
        "  postgresql://user:password@host/dbname?sslmode=require",
    );
  }
  return url;
}

function createClient() {
  return postgres(connectionString(), {
    // Serverless platforms run many short-lived instances, so each one keeps a
    // single connection rather than a pool that would exhaust the server.
    max: process.env.VERCEL ? 1 : 10,
    idle_timeout: 20,
    connect_timeout: 15,
    // Transaction-mode poolers (Supabase :6543, Neon -pooler) cannot use named
    // prepared statements.
    prepare: false,
    onnotice: () => {},
  });
}

// Next.js re-evaluates modules on every hot reload in development; cache the
// client on globalThis so we never open more connections than intended.
const globalForDb = globalThis as unknown as {
  __iicaSql?: ReturnType<typeof createClient>;
};

export const sql = globalForDb.__iicaSql ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__iicaSql = sql;
}
