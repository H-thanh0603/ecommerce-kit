import { cookies, headers } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { SESSION_COOKIE, readSessionToken, sessionMatchesTenant, signSession, type SessionPayload } from "@/server/session";
import { getTenantSchema } from "@/server/tenant-context";
import { resolveBaseUrl } from "@/server/tenant";

export type { SessionPayload };

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const session = await readSessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  if (!sessionMatchesTenant(session, getTenantSchema())) return null;
  // Đối chiếu tokenVersion với DB — JWT cũ sau khi đổi mật khẩu / reset bị từ chối.
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { tokenVersion: true, role: true, email: true },
    });
    if (!user) return null;
    if ((session.tokenVersion ?? 0) !== user.tokenVersion) return null;
    // Role luôn lấy từ DB — hạ quyền admin có hiệu lực ngay, không chờ JWT hết hạn.
    const role = user.role === "admin" ? "admin" : "customer";
    return { ...session, role, email: user.email };
  } catch {
    // DB lỗi không giữa lúc dev — vẫn tin JWT (proxy đã xác minh chữ ký).
    return session;
  }
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerUser(name: string, email: string, password: string) {
  const n = name.trim();
  const e = email.trim().toLowerCase();
  if (!n || n.length > 80 || !EMAIL_RE.test(e) || e.length > 120) {
    return { ok: false as const, message: "Họ tên / email không hợp lệ" };
  }
  if (password.length < 6 || password.length > 72) {
    return { ok: false as const, message: "Mật khẩu 6–72 ký tự" };
  }
  const exists = await prisma.user.findUnique({ where: { email: e } });
  if (exists) return { ok: false as const, message: "Email đã được dùng" };
  const user = await prisma.user.create({
    data: {
      name: n,
      email: e,
      passwordHash: await hashPassword(password),
      role: "customer",
    },
  });
  const session: SessionPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: "customer",
    tokenVersion: user.tokenVersion,
    tenantSlug: getTenantSchema(),
  };
  await setSessionCookie(session);
  return { ok: true as const, message: "Tạo tài khoản thành công", user: session };
}

export type LoginResult =
  | { ok: true; message: string; user: SessionPayload }
  | { ok: false; message: string; mfaRequired?: boolean };

export async function loginUser(email: string, password: string, mfaCode?: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { ok: false, message: "Email hoặc mật khẩu chưa đúng" };
  }
  // MFA (cờ `mfa` feature + user đã bật): bắt buộc TOTP hoặc recovery code.
  const { isFeatureOn } = await import("@/server/settings");
  if (user.mfaEnabled && (await isFeatureOn("mfa"))) {
    const { verifyTotp } = await import("@/server/mfa");
    let pass = mfaCode ? verifyTotp(user.mfaSecret, mfaCode) : false;
    if (!pass && mfaCode) {
      pass = await verifyRecoveryCode(user.id, user.mfaRecovery, mfaCode);
    }
    if (!pass) {
      return { ok: false, message: "Cần mã xác thực 2 lớp (TOTP)", mfaRequired: true };
    }
  }
  const session: SessionPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === "admin" ? "admin" : "customer",
    points: user.points,
    memberTier: user.memberTier,
    tokenVersion: user.tokenVersion,
    tenantSlug: getTenantSchema(),
  };
  await setSessionCookie(session);
  return { ok: true, message: "Đăng nhập thành công", user: session };
}

async function verifyRecoveryCode(userId: string, storedJson: string, code: string): Promise<boolean> {
  const { normalizeRecovery } = await import("@/server/mfa");
  const target = normalizeRecovery(code);
  if (!target) return false;
  let list: string[] = [];
  try {
    list = JSON.parse(storedJson);
  } catch {
    return false;
  }
  if (!Array.isArray(list) || !list.length) return false;
  for (let i = 0; i < list.length; i++) {
    if (await verifyPassword(target, list[i])) {
      const next = list.filter((_, j) => j !== i);
      await prisma.user.update({ where: { id: userId }, data: { mfaRecovery: JSON.stringify(next) } });
      return true;
    }
  }
  return false;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  // getSession đã đồng bộ role từ DB; double-check id vẫn còn là admin.
  try {
    const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
    if (!user || user.role !== "admin") return null;
  } catch {
    /* offline → session đã verify chữ ký */
  }
  return session;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return { ok: true as const, message: "Nếu email tồn tại, link đã được gửi." };
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const tokenHash = await hashPassword(token);
  // Hủy mọi token chưa dùng trước đó — chỉ link mới nhất có hiệu lực.
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId: user.id, used: false } }),
    prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    }),
  ]);
  const { mailPasswordReset } = await import("@/server/mail");
  // Link mail theo Host của request đang gõ (domain tenant); ngoài request
  // context (script/test/cron) → fallback APP_URL.
  let host: string | null = null;
  try {
    host = (await headers()).get("host");
  } catch {
    /* ngoài request context → fallback APP_URL */
  }
  const base = resolveBaseUrl(host);
  // Token ở fragment (#) — không lọt access log / Referer của server.
  await mailPasswordReset(user.email, `${base}/dat-lai-mat-khau#email=${encodeURIComponent(user.email)}&token=${token}`);
  return { ok: true as const, message: "Nếu email tồn tại, link đã được gửi." };
}

export async function resetPassword(email: string, token: string, password: string) {
  if (password.length < 6 || password.length > 72) return { ok: false as const, message: "Mật khẩu 6–72 ký tự" };
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
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        // Bump tokenVersion → mọi session JWT cũ bị revoke ngay (Q26).
        tokenVersion: { increment: 1 },
      },
    }),
    prisma.passwordReset.update({ where: { id: matched.id }, data: { used: true } }),
    prisma.passwordReset.deleteMany({ where: { userId: user.id, id: { not: matched.id } } }),
  ]);
  await clearSessionCookie();
  return { ok: true as const, message: "Đã đổi mật khẩu" };
}
