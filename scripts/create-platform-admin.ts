import bcrypt from "bcryptjs";
import { platformDb } from "../src/server/platform-db";

async function main() {
  const [emailRaw, password] = process.argv.slice(2);
  const email = emailRaw?.trim().toLowerCase();
  if (!email || !password || password.length < 8) {
    console.error("Usage: tsx scripts/create-platform-admin.ts <email> <password≥8>");
    process.exit(1);
  }
  await platformDb.platformAdmin.upsert({
    where: { email },
    create: { email, passwordHash: await bcrypt.hash(password, 10) },
    update: { passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log("OK platform admin:", email);
  await platformDb.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
