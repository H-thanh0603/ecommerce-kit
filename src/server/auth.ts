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

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { ok: true as const, message: "Nếu email tồn tại, link đã được gửi." };
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const tokenHash = await hashPassword(token);
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });
  const { mailPasswordReset } = await import("@/server/mail");
  const base = process.env.APP_URL || "http://localhost:3000";
  await mailPasswordReset(user.email, `${base}/dat-lai-mat-khau?email=${encodeURIComponent(user.email)}&token=${token}`);
  return { ok: true as const, message: "Nếu email tồn tại, link đã được gửi." };
}

export async function resetPassword(email: string, token: string, password: string) {
  if (password.length < 6) return { ok: false as const, message: "Mật khẩu tối thiểu 6 ký tự" };
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { ok: false as const, message: "Token không hợp lệ" };
  const rows = await prisma.passwordReset.findMany({
    where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  let matched = null as (typeof rows)[number] | null;
  for (const row of rows) {
    if (await verifyPassword(token, row.tokenHash)) {
      matched = row;
      break;
    }
  }
  if (!matched) return { ok: false as const, message: "Token hết hạn hoặc không đúng" };
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } }),
    prisma.passwordReset.update({ where: { id: matched.id }, data: { used: true } }),
  ]);
  return { ok: true as const, message: "Đã đổi mật khẩu" };
}
