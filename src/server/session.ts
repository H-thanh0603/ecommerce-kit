import { SignJWT, jwtVerify } from "jose";
import type { UserSession } from "@/types";

export const SESSION_COOKIE = "ek_session";

export type SessionPayload = UserSession & { id: string };

function secret() {
  const raw = process.env.AUTH_SECRET || "dev-only-change-me";
  return new TextEncoder().encode(raw);
}

export async function signSession(user: SessionPayload) {
  return new SignJWT({ id: user.id, name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readSessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.email || !payload.role || !payload.id) return null;
    return {
      id: String(payload.id),
      name: String(payload.name || ""),
      email: String(payload.email),
      role: payload.role === "admin" ? "admin" : "customer",
    };
  } catch {
    return null;
  }
}
