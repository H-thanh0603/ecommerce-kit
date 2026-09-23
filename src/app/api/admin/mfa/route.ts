import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth";
import { isFeatureOn } from "@/server/settings";
import { prisma } from "@/server/db";
import { generateRecoveryCodes, generateTotpSecret, totpUri, verifyTotp } from "@/server/mfa";
import { hashPassword, verifyPassword } from "@/server/auth";

/**
 * MFA TOTP cho admin (Q29) — cờ feature `mfa` default OFF.
 * POST action=setup  → sinh secret (chưa lưu), trả otpauth URI + recovery preview
 * POST action=verify → xác nhận code đầu, lưu secret + recovery (bcrypt)
 * POST action=disable → tắt MFA (cần password)
 */
async function gate() {
  if (!(await isFeatureOn("mfa"))) {
    return NextResponse.json({ message: "MFA đang tắt — bật cờ `mfa` ở /admin/cai-dat" }, { status: 404 });
  }
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ message: "Cần quyền admin" }, { status: 401 });
  return { admin };
}

export async function GET() {
  const g = await gate();
  if (g instanceof NextResponse) return g;
  const user = await prisma.user.findUnique({
    where: { id: g.admin.id },
    select: { mfaEnabled: true },
  });
  return NextResponse.json({ mfaEnabled: Boolean(user?.mfaEnabled) });
}

export async function POST(req: Request) {
  const g = await gate();
  if (g instanceof NextResponse) return g;
  const { admin } = g;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "setup") {
    if (admin.role !== "admin") {
      return NextResponse.json({ message: "Chỉ admin bật MFA" }, { status: 403 });
    }
    const secret = generateTotpSecret();
    const recovery = generateRecoveryCodes(10);
    // Chưa lưu secret — chờ action=verifycode với TOTP hợp lệ.
    return NextResponse.json({
      ok: true,
      secret,
      otpauth: totpUri(secret, admin.email),
      recovery,
      pending: true,
    });
  }

  if (action === "verify") {
    const secret = String(body.secret || "");
    const code = String(body.code || "");
    if (!secret || !verifyTotp(secret, code)) {
      return NextResponse.json({ ok: false, message: "Mã TOTP không đúng" }, { status: 400 });
    }
    const recovery: string[] = Array.isArray(body.recovery) ? body.recovery.slice(0, 10).map(String) : [];
    const hashed: string[] = [];
    for (const r of recovery) {
      hashed.push(await hashPassword(r.toLowerCase().replace(/[^a-z0-9]/g, "")));
    }
    await prisma.user.update({
      where: { id: admin.id },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaRecovery: JSON.stringify(hashed),
      },
    });
    const { logAudit } = await import("@/server/audit");
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "mfa.enable",
      entity: "User",
      entityId: admin.id,
    });
    // Trả recovery 1 lần cuối (đã lưu bcrypt ở DB — hiển thị lại bản plaintext lần này).
    return NextResponse.json({ ok: true, recovery });
  }

  if (action === "disable") {
    const password = String(body.password || "");
    const user = await prisma.user.findUnique({ where: { id: admin.id } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ ok: false, message: "Sai mật khẩu" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: admin.id },
      data: { mfaEnabled: false, mfaSecret: "", mfaRecovery: "[]" },
    });
    const { logAudit } = await import("@/server/audit");
    await logAudit({
      actorId: admin.id,
      actorEmail: admin.email,
      action: "mfa.disable",
      entity: "User",
      entityId: admin.id,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "action không hỗ trợ" }, { status: 400 });
}
