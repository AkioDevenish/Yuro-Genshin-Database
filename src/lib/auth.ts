import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { SESSION_COOKIE, readSession, type SessionPayload } from "./session";
import { can, type Permission } from "./roles";

export type CurrentUser = SessionPayload;

/** Returns the signed-in user, or null. Re-checks the DB so disabled accounts lose access. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const session = await readSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;

  const [row] = await sql<
    { id: number; name: string; email: string; role: string; status: string }[]
  >`SELECT id, name, email, role, status FROM users WHERE id = ${session.userId}`;

  if (!row || row.status !== "ACTIVE") return null;

  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    role: row.role as CurrentUser["role"],
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in pages: sends users without the permission to the access-denied screen. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect(`/denied?permission=${permission}`);
  return user;
}

/** Use in server actions: throws instead of redirecting so the caller can show an error. */
export async function assertPermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("You are not signed in.");
  if (!can(user.role, permission)) {
    throw new Error("Your role does not allow this action.");
  }
  return user;
}

export async function recordAudit(input: {
  user: CurrentUser | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  details?: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO audit_logs (user_id, user_label, action, entity, entity_id, details)
    VALUES (
      ${input.user?.userId ?? null},
      ${input.user ? `${input.user.name} (${input.user.email})` : "system"},
      ${input.action},
      ${input.entity},
      ${input.entityId == null ? null : String(input.entityId)},
      ${input.details ?? null}
    )`;
}
