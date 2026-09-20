import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { SESSION_COOKIE, readSessionToken, signSession, type SessionPayload } from "@/server/session";

export type { SessionPayload };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export async function setSessionCookie(user: SessionPayload) {
  const token = await signSession(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function registerUser(name: string, email: string, password: string) {
  if (!name.trim() || !email.trim() || password.length < 6) {
    return { ok: false as const, message: "Điền đủ thông tin, mật khẩu tối thiểu 6 ký tự" };
  }
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return { ok: false as const, message: "Email đã được dùng" };
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      role: "customer",
    },
  });
  const session: SessionPayload = { id: user.id, name: user.name, email: user.email, role: "customer" };
  await setSessionCookie(session);
  return { ok: true as const, message: "Tạo tài khoản thành công", user: session };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false as const, message: "Email hoặc mật khẩu chưa đúng" };
  }
  const session: SessionPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === "admin" ? "admin" : "customer",
  };
  await setSessionCookie(session);
  return { ok: true as const, message: "Đăng nhập thành công", user: session };
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}
