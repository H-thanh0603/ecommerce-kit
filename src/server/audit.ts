import { prisma } from "@/server/db";

export type AuditInput = {
  actorId?: string;
  actorEmail?: string;
  action: string;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
};

function clip(v: unknown, max = 2000): string {
  if (v === undefined || v === null) return "";
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > max ? s.slice(0, max) : s;
  } catch {
    return String(v).slice(0, max);
  }
}

/** Ghi AuditLog — best-effort, không bao giờ làm vỡ luồng admin. */
export async function logAudit(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: clip(input.actorId, 64),
        actorEmail: clip(input.actorEmail, 120),
        action: clip(input.action, 80),
        entity: clip(input.entity, 60),
        entityId: clip(input.entityId, 80),
        before: clip(input.before),
        after: clip(input.after),
        ip: clip(input.ip, 60),
      },
    });
  } catch {
    /* bỏ qua */
  }
}

export async function listAuditLog(take = 100) {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: Math.min(500, Math.max(1, take)) });
}
