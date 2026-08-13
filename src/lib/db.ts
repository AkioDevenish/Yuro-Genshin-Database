import postgres from "postgres";

type Client = ReturnType<typeof postgres>;

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

function createClient(): Client {
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
const globalForDb = globalThis as unknown as { __iicaSql?: Client };

function client(): Client {
  globalForDb.__iicaSql ??= createClient();
  return globalForDb.__iicaSql;
}

/**
 * Connecting is deferred until the first query. Building the app therefore does
 * not need a reachable database — or even DATABASE_URL — which matters because
 * Next.js imports every route module while collecting page configuration.
 */
export const sql: Client = new Proxy((() => {}) as unknown as Client, {
  apply(_target, _thisArg, args: unknown[]) {
    return (client() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, property) {
    const value = Reflect.get(client(), property);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});
