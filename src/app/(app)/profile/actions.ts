"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { requireUser, recordAudit } from "@/lib/auth";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export type ProfileState = { error?: string; message?: string };

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter your name." };

  await sql`UPDATE users SET name = ${name} WHERE id = ${user.userId}`;

  // Refresh the cookie so the sidebar shows the new name straight away.
  const store = await cookies();
  store.set(
    SESSION_COOKIE,
    await signSession({ ...user, name }),
    sessionCookieOptions,
  );

  await recordAudit({ user, action: "UPDATE", entity: "profile", entityId: user.userId });
  revalidatePath("/profile");
  return { message: "Your details were saved." };
}

export async function changePasswordAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  const [row] = await sql<{ password_hash: string }[]>`
    SELECT password_hash FROM users WHERE id = ${user.userId}`;
  if (!row) return { error: "Your account could not be found." };

  if (!(await verifyPassword(current, row.password_hash))) {
    return { error: "Your current password is not correct." };
  }
  if (next !== confirm) return { error: "The new passwords do not match." };

  const problem = passwordProblem(next);
  if (problem) return { error: problem };

  await sql`UPDATE users SET password_hash = ${await hashPassword(next)} WHERE id = ${user.userId}`;

  await recordAudit({ user, action: "CHANGE_PASSWORD", entity: "profile", entityId: user.userId });
  return { message: "Your password was changed." };
}
