import { describe, expect, it } from "vitest";
import { readSessionToken, sessionMatchesTenant, signSession } from "./session";

describe("session tenant claim (T4)", () => {
  it("sign/read roundtrip giữ tenantSlug", async () => {
    const token = await signSession({
      id: "u1", name: "A", email: "a@x.vn", role: "customer",
      tokenVersion: 0, tenantSlug: "shopa",
    });
    const payload = await readSessionToken(token);
    expect(payload?.tenantSlug).toBe("shopa");
    expect(sessionMatchesTenant(payload!, "shopb")).toBe(false);
    expect(sessionMatchesTenant(payload!, "shopa")).toBe(true);
  });

  it("session cũ không claim → chấp nhận (backward compat deploy)", async () => {
    const token = await signSession({
      id: "u2", name: "B", email: "b@x.vn", role: "customer", tokenVersion: 0,
    });
    const payload = await readSessionToken(token);
    expect(payload?.tenantSlug).toBeUndefined();
    expect(sessionMatchesTenant(payload!, "shopb")).toBe(true);
  });
});
