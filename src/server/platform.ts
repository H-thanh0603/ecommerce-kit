import { cookies } from "next/headers";
import { PLATFORM_COOKIE, readPlatformSession } from "./platform-auth";
import { platformDb } from "./platform-db";

/**
 * Guard Node-side cho /platform: cookie → JWT (role platform) → đối chiếu
 * PlatformAdmin trong schema platform. Tách khỏi platform-auth.ts vì file đó
 * import ở proxy.ts (Edge) — không được kéo next/headers + Prisma vào Edge.
 */
export async function requirePlatformAdmin() {
  const jar = await cookies();
  const s = await readPlatformSession(jar.get(PLATFORM_COOKIE)?.value);
  if (!s) return null;
  try {
    const admin = await platformDb.platformAdmin.findUnique({ where: { id: s.id } });
    if (!admin) return null;
    return { id: admin.id, email: admin.email, role: "platform" as const };
  } catch {
    // DB lỗi giữa chừng → không tin token (fail-closed cho route mutate).
    return null;
  }
}
