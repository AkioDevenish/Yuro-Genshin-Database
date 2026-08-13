"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { assertPermission, recordAudit } from "@/lib/auth";
import { hashPassword, passwordProblem } from "@/lib/password";
import { isRole, type Role } from "@/lib/roles";

export type UserState = { error?: string; ok?: boolean; message?: string };

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createUserAction(_prev: UserState, formData: FormData): Promise<UserState> {
  try {
    const admin = await assertPermission("users.manage");

    const name = text(formData, "name");
    const email = text(formData, "email").toLowerCase();
    const role = text(formData, "role");
    const password = String(formData.get("password") ?? "");

    if (!name) return { error: "Enter the person's name." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
    if (!isRole(role)) return { error: "Choose a role." };

    const problem = passwordProblem(password);
    if (problem) return { error: problem };

    await sql`
      INSERT INTO users (name, email, password_hash, role, status)
      VALUES (${name}, ${email}, ${await hashPassword(password)}, ${role}, 'ACTIVE')`;

    await recordAudit({
      user: admin,
      action: "CREATE",
      entity: "user",
      details: `${name} <${email}> as ${role}`,
    });

    revalidatePath("/users");
    return { ok: true, message: `${name} can now sign in.` };
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return { error: "An account already uses that email address." };
    }
    return { error: error instanceof Error ? error.message : "Could not create the account." };
  }
}

export async function updateUserAction(_prev: UserState, formData: FormData): Promise<UserState> {
  try {
    const admin = await assertPermission("users.manage");

    const id = Number(formData.get("id"));
    const name = text(formData, "name");
    const email = text(formData, "email").toLowerCase();
    const role = text(formData, "role");
    const status = text(formData, "status") === "DISABLED" ? "DISABLED" : "ACTIVE";
    const password = String(formData.get("password") ?? "");

    if (!id) return { error: "Missing account reference." };
    if (!name) return { error: "Enter the person's name." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
    if (!isRole(role)) return { error: "Choose a role." };

    const [target] = await sql<{ id: number; role: Role; status: string }[]>`
      SELECT id, role, status FROM users WHERE id = ${id}`;
    if (!target) return { error: "That account no longer exists." };

    const guard = await lastAdminGuard(target, role, status, admin.userId === id);
    if (guard) return { error: guard };

    if (password) {
      const problem = passwordProblem(password);
      if (problem) return { error: problem };
      await sql`UPDATE users SET password_hash = ${await hashPassword(password)} WHERE id = ${id}`;
      await recordAudit({ user: admin, action: "RESET_PASSWORD", entity: "user", entityId: id });
    }

    await sql`
      UPDATE users SET name = ${name}, email = ${email}, role = ${role}, status = ${status}
      WHERE id = ${id}`;

    await recordAudit({
      user: admin,
      action: "UPDATE",
      entity: "user",
      entityId: id,
      details: `${name} <${email}> — ${role}, ${status}`,
    });

    revalidatePath("/users");
    return { ok: true, message: "Account updated." };
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return { error: "An account already uses that email address." };
    }
    return { error: error instanceof Error ? error.message : "Could not update the account." };
  }
}

export async function deleteUserAction(_prev: UserState, formData: FormData): Promise<UserState> {
  try {
    const admin = await assertPermission("users.manage");
    const id = Number(formData.get("id"));
    if (!id) return { error: "Missing account reference." };
    if (id === admin.userId) return { error: "You cannot delete your own account." };

    const [target] = await sql<{ name: string; email: string; role: Role }[]>`
      SELECT name, email, role FROM users WHERE id = ${id}`;
    if (!target) return { ok: true };

    if (target.role === "ADMIN" && (await activeAdminCount()) <= 1) {
      return { error: "This is the last active administrator — promote someone else first." };
    }

    // Movements keep their history; the schema nulls the user reference.
    await sql`DELETE FROM users WHERE id = ${id}`;

    await recordAudit({
      user: admin,
      action: "DELETE",
      entity: "user",
      entityId: id,
      details: `${target.name} <${target.email}>`,
    });

    revalidatePath("/users");
    return { ok: true, message: `${target.name} no longer has access.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete the account." };
  }
}

async function activeAdminCount(): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'`;
  return row.n;
}

/** Stops the organisation from locking itself out of the system. */
async function lastAdminGuard(
  target: { role: Role; status: string },
  nextRole: Role,
  nextStatus: string,
  isSelf: boolean,
): Promise<string | null> {
  const wasActiveAdmin = target.role === "ADMIN" && target.status === "ACTIVE";
  const staysActiveAdmin = nextRole === "ADMIN" && nextStatus === "ACTIVE";
  if (wasActiveAdmin && !staysActiveAdmin && (await activeAdminCount()) <= 1) {
    return isSelf
      ? "You are the only active administrator — appoint another one before changing your own access."
      : "This is the last active administrator — appoint another one first.";
  }
  return null;
}
