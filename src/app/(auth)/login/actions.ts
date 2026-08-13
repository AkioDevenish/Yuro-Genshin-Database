"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, signSession, sessionCookieOptions } from "@/lib/session";
import { recordAudit } from "@/lib/auth";
import type { Role } from "@/lib/roles";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Enter your email address and password." };
  }

  const user = db
    .prepare("SELECT id, name, email, password_hash, role, status FROM users WHERE lower(email) = ?")
    .get(email) as
    | {
        id: number;
        name: string;
        email: string;
        password_hash: string;
        role: Role;
        status: string;
      }
    | undefined;

  // Same message either way so the form never confirms which emails exist.
  const invalid = { error: "Those credentials do not match an account." };
  if (!user) return invalid;
  if (!(await verifyPassword(password, user.password_hash))) return invalid;

  if (user.status !== "ACTIVE") {
    return { error: "This account has been disabled. Contact an administrator." };
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id);

  const session = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(session), sessionCookieOptions);

  recordAudit({ user: session, action: "SIGN_IN", entity: "session", entityId: user.id });

  redirect("/dashboard");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
