"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
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

    db.prepare(
      "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, 'ACTIVE')",
    ).run(name, email, await hashPassword(password), role);

    recordAudit({
      user: admin,
      action: "CREATE",
      entity: "user",
      details: `${name} <${email}> as ${role}`,
    });

    revalidatePath("/users");
    return { ok: true, message: `${name} can now sign in.` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE constraint failed")) {
      return { error: "An account already uses that email address." };
    }
    return { error: message || "Could not create the account." };
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

    const target = db.prepare("SELECT id, role, status FROM users WHERE id = ?").get(id) as
      | { id: number; role: Role; status: string }
      | undefined;
    if (!target) return { error: "That account no longer exists." };

    const guard = lastAdminGuard(target, role, status, admin.userId === id);
    if (guard) return { error: guard };

    if (password) {
      const problem = passwordProblem(password);
      if (problem) return { error: problem };
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
        await hashPassword(password),
        id,
      );
      recordAudit({ user: admin, action: "RESET_PASSWORD", entity: "user", entityId: id });
    }

    db.prepare("UPDATE users SET name = ?, email = ?, role = ?, status = ? WHERE id = ?").run(
      name,
      email,
      role,
      status,
      id,
    );

    recordAudit({
      user: admin,
      action: "UPDATE",
      entity: "user",
      entityId: id,
      details: `${name} <${email}> — ${role}, ${status}`,
    });

    revalidatePath("/users");
    return { ok: true, message: "Account updated." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE constraint failed")) {
      return { error: "An account already uses that email address." };
    }
    return { error: message || "Could not update the account." };
  }
}

export async function deleteUserAction(_prev: UserState, formData: FormData): Promise<UserState> {
  try {
    const admin = await assertPermission("users.manage");
    const id = Number(formData.get("id"));
    if (!id) return { error: "Missing account reference." };
    if (id === admin.userId) return { error: "You cannot delete your own account." };

    const target = db.prepare("SELECT name, email, role FROM users WHERE id = ?").get(id) as
      | { name: string; email: string; role: Role }
      | undefined;
    if (!target) return { ok: true };

    if (target.role === "ADMIN" && activeAdminCount() <= 1) {
      return { error: "This is the last active administrator — promote someone else first." };
    }

    // Movements keep their history; the schema nulls the user reference.
    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    recordAudit({
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

function activeAdminCount(): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE'")
    .get() as { n: number };
  return row.n;
}

/** Stops the organisation from locking itself out of the system. */
function lastAdminGuard(
  target: { role: Role; status: string },
  nextRole: Role,
  nextStatus: string,
  isSelf: boolean,
): string | null {
  const wasActiveAdmin = target.role === "ADMIN" && target.status === "ACTIVE";
  const staysActiveAdmin = nextRole === "ADMIN" && nextStatus === "ACTIVE";
  if (wasActiveAdmin && !staysActiveAdmin && activeAdminCount() <= 1) {
    return isSelf
      ? "You are the only active administrator — appoint another one before changing your own access."
      : "This is the last active administrator — appoint another one first.";
  }
  return null;
}
