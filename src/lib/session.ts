import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./roles";

export const SESSION_COOKIE = "iica_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export type SessionPayload = {
  userId: number;
  name: string;
  email: string;
  role: Role;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is missing or too short. Set it to a random string of at least 32 characters.",
      );
    }
    return new TextEncoder().encode("iica-development-secret-do-not-use-in-production");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "number" || typeof payload.role !== "string") return null;
    return {
      userId: payload.userId,
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_MAX_AGE_SECONDS,
} as const;
