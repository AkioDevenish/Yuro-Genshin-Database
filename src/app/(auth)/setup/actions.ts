"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { ensureSchema } from "@/lib/setup";
import { hashPassword, passwordProblem } from "@/lib/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";
import { recordAudit } from "@/lib/auth";

export type SetupState = { error?: string };

export async function completeSetupAction(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  try {
    await ensureSchema();

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (!name) return { error: "Enter your name." };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email address." };
    if (password !== confirm) return { error: "The two passwords do not match." };

    const problem = passwordProblem(password);
    if (problem) return { error: problem };

    // WHERE NOT EXISTS makes this atomic: if any account already exists —
    // including one created a moment ago by someone else — nothing is inserted.
    const [created] = await sql<{ id: number }[]>`
      INSERT INTO users (name, email, password_hash, role, status)
      SELECT ${name}, ${email}, ${await hashPassword(password)}, 'ADMIN', 'ACTIVE'
      WHERE NOT EXISTS (SELECT 1 FROM users)
      RETURNING id`;

    if (!created) {
      return { error: "This system has already been set up. Sign in with an existing account." };
    }

    const session = { userId: created.id, name, email, role: "ADMIN" as const };

    const store = await cookies();
    store.set(SESSION_COOKIE, await signSession(session), sessionCookieOptions);

    await recordAudit({
      user: session,
      action: "SETUP",
      entity: "system",
      entityId: created.id,
      details: `First administrator created: ${name} <${email}>`,
    });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return { error: "An account already uses that email address." };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Could not complete setup: ${message}` };
  }

  redirect("/dashboard");
}
