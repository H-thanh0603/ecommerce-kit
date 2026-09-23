import { SignJWT, jwtVerify } from "jose";

export const PLATFORM_COOKIE = "ek_platform";

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw === "dev-only-change-me" || raw === "doi-thanh-chuoi-ngau-nhien-khi-clone") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET bắt buộc trên production");
    }
  }
  return new TextEncoder().encode(raw || "dev-only-change-me");
}

export async function signPlatformSession(a: { id: string; email: string }) {
  return new SignJWT({ id: a.id, email: a.email, role: "platform" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function readPlatformSession(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "platform" || !payload.id) return null;
    return {
      id: String(payload.id),
      email: String(payload.email),
      role: "platform" as const,
    };
  } catch {
    return null;
  }
}
