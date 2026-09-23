#!/usr/bin/env node
/**
 * Tách dự án khách mới từ khung:
 *   npm run new:project -- ten-khach --brand "Tên Shop" --dir ../ten-khach
 *
 * Việc script làm:
 * 1. Copy toàn repo (trừ .git/node_modules/.next/dev.db/.env) sang thư mục đích
 * 2. Đổi package.json name + brand/logo trong src/config/site.ts
 * 3. Sinh .env mới từ .env.example với AUTH_SECRET ngẫu nhiên
 * 4. In checklist việc tiếp theo
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomBytes } from "crypto";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set([".git", "node_modules", ".next", ".env", "dev.db", "tsconfig.tsbuildinfo", "coverage"]);

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const name = process.argv[2];
if (!name || name.startsWith("--")) {
  console.error('Dùng: npm run new:project -- <ten-khach> [--brand "Tên Shop"] [--dir ../ten-khach]');
  process.exit(1);
}
const brand = arg("--brand", name);
const target = resolve(arg("--dir", join(ROOT, "..", name)));
if (existsSync(target)) {
  console.error(`Thư mục đích đã tồn tại: ${target}`);
  process.exit(1);
}

mkdirSync(target, { recursive: true });
cpSync(ROOT, target, {
  recursive: true,
  filter: (src) => {
    const base = src.split("/").pop();
    return !SKIP.has(base);
  },
});

// 1. package.json
const pkgPath = join(target, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// 2. brand trong site.ts (chỉ chạm khối brand đầu file, không đụng chữ Atelier ở chỗ khác)
const sitePath = join(target, "src/config/site.ts");
let site = readFileSync(sitePath, "utf8");
site = site.replace('name: "Atelier",', `name: ${JSON.stringify(brand)},`);
site = site.replace('logoText: "Atelier",', `logoText: ${JSON.stringify(brand)},`);
site = site.replace("hello@atelier.vn", `hello@${pkg.name}.vn`);
site = site.replace("admin@atelier.vn", `admin@${pkg.name}.vn`);
writeFileSync(sitePath, site);

// 3. .env mới với AUTH_SECRET ngẫu nhiên
const example = readFileSync(join(ROOT, ".env.example"), "utf8");
const secret = randomBytes(48).toString("hex");
const env = example.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`);
writeFileSync(join(target, ".env"), env);

console.log(`Xong: ${target}`);
console.log(`- package name: ${pkg.name}`);
console.log(`- brand: ${brand}`);
console.log(`- AUTH_SECRET: đã sinh ngẫu nhiên`);
console.log(`Tiếp theo trong ${target}:`);
console.log(`  1. npm install && npx prisma migrate deploy && npx tsx prisma/seed.ts`);
console.log(`  2. Đổi ADMIN_PASSWORD trong .env TRƯỚC khi seed lần đầu (prod không nhận admin123)`);
console.log(`  3. Bật/tắt module trong src/config/site.ts (features)`);
console.log(`  4. Vào /admin/cai-dat để đổi màu/logo/phí ship trên UI`);
