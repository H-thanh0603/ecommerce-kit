import { describe, expect, it } from "vitest";
import { readPlatformSession, signPlatformSession } from "./platform-auth";

describe("platform session", () => {
  it("sign/read roundtrip role platform", async () => {
    const tok = await signPlatformSession({ id: "pa1", email: "root@kit.vn" });
    expect(await readPlatformSession(tok)).toMatchObject({
      id: "pa1",
      email: "root@kit.vn",
      role: "platform",
    });
  });

  it("token customer role bị từ chối", async () => {
    const { signSession } = await import("./session");
    const customerTok = await signSession({
      id: "u", name: "U", email: "u@x.vn", role: "customer", tokenVersion: 0,
    });
    expect(await readPlatformSession(customerTok)).toBeNull();
    expect(await readPlatformSession(undefined)).toBeNull();
  });
});
