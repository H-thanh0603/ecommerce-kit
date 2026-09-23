import { describe, expect, it } from "vitest";
import { prisma } from "./db";
import { listAuditLog, logAudit } from "./audit";

describe("audit log", () => {
  it("ghi + list được actor/action; không throw khi field rỗng", async () => {
    const marker = `audit-test-${Date.now()}`;
    await logAudit({
      actorId: "u-test",
      actorEmail: "admin@test.vn",
      action: "settings.update",
      entity: "SiteSetting",
      entityId: "features",
      before: { a: 1 },
      after: { a: 2 },
      ip: "127.0.0.1",
    });
    // Field rỗng vẫn không throw
    await logAudit({ action: marker });

    const rows = await listAuditLog(200);
    expect(rows.some((r) => r.action === "settings.update" && r.actorEmail === "admin@test.vn")).toBe(true);
    expect(rows.some((r) => r.action === marker)).toBe(true);

    // Dọn
    await prisma.auditLog.deleteMany({ where: { action: { in: ["settings.update", marker] } } });
  });
});
