#!/usr/bin/env node
/**
 * Tách dự án khách mới từ khung:
 *   npm run new:project -- ten-khach --brand "Tên Shop" [--tagline "..."] [--description "..."] [--prefix EK] [--hero <url>] [--dir ../ten-khach]
 *
 * Việc script làm:
 * 1. Copy toàn repo (trừ .git/node_modules/.next/dev.db/.env) sang thư mục đích
 * 2. Đổi package.json + package-lock.json name và rebrand src/config/site.ts
 *    (brand, tagline, mô tả, SEO, tài khoản nhận CK, tiền tố mã đơn, ảnh hero)
 * 3. Sinh .env mới từ .env.example với AUTH_SECRET ngẫu nhiên
 * 4. git init ở thư mục đích
 * 5. In checklist việc tiếp theo
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { randomBytes } from "crypto";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set([".git", "node_modules", ".next", ".env", "dev.db", "tsconfig.tsbuildinfo", "coverage"]);

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Bỏ dấu tiếng Việt + in hoa — dùng cho tên tài khoản ngân hàng (không nhận dấu). */
function asciiUpper(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase();
}

const name = process.argv[2];
if (!name || name.startsWith("--")) {
  console.error('Dùng: npm run new:project -- <ten-khach> [--brand "Tên Shop"] [--tagline "..."] [--description "..."] [--prefix EK] [--hero <url>] [--dir ../ten-khach]');
  process.exit(1);
}
const brand = arg("--brand", name);
const tagline = arg("--tagline", "");
const description = arg("--description", `Mua sắm trực tuyến tại ${brand}. Giao hàng toàn quốc, hỗ trợ đổi trả.`);
const hero = arg("--hero", "");
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

// 1. package.json + package-lock.json (npm ci đòi lockfile khớp name với package.json)
const pkgPath = join(target, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = name.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
try {
  const lockPath = join(target, "package-lock.json");
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  lock.name = pkg.name;
  if (lock.packages?.[""]) lock.packages[""].name = pkg.name;
  writeFileSync(lockPath, JSON.stringify(lock, null, 2) + "\n");
} catch {
  console.warn("Không tìm thấy/đọc được package-lock.json — bỏ qua bước đồng bộ lockfile.");
}

// 2. rebrand src/config/site.ts
const sitePath = join(target, "src/config/site.ts");
let site = readFileSync(sitePath, "utf8");
site = site.replace('name: "Ekkit",', `name: ${JSON.stringify(brand)},`);
site = site.replace('logoText: "Ekkit",', `logoText: ${JSON.stringify(brand)},`);
site = site.replace("hello@ekkit.vn", `hello@${pkg.name}.vn`);
site = site.replace("admin@ekkit.vn", `admin@${pkg.name}.vn`);
if (tagline) site = site.replace('tagline: "Chọn chậm. Dùng lâu.",', `tagline: ${JSON.stringify(tagline)},`);
const desc = JSON.stringify(description);
site = site.replace('"Cửa hàng trực tuyến bán sản phẩm chọn lọc — thời trang, nhà cửa và lifestyle."', desc);
site = site.replace('"Mua sắm thời trang, nhà cửa và lifestyle. Giao hàng toàn quốc, đổi trả 7 ngày."', desc);
site = site.replace('titleTemplate: "%s · Ekkit",', `titleTemplate: "%s · ${brand}",`);
site = site.replace('defaultTitle: "Ekkit — Cửa hàng trực tuyến",', `defaultTitle: "${brand} — Cửa hàng trực tuyến",`);
site = site.replace('accountName: "CONG TY EKKIT",', `accountName: "CONG TY ${asciiUpper(brand)}",`);
// Tiền tố mã đơn: mặc định lấy chữ đầu của slug (tối đa 4 ký tự), đổ bằng --prefix
const prefix = (
  (arg("--prefix", "") ||
    name.replace(/[^a-z0-9]+/g, " ").trim().split(" ")[0] ||
    "EK"
  ).replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 4)) || "EK";
site = site.replace('codePrefix: "EK",', `codePrefix: ${JSON.stringify(prefix)},`);
if (hero) site = site.replace(/image: "https:\/\/images\.unsplash\.com\/[^"]+"/, `image: ${JSON.stringify(hero)},`);
writeFileSync(sitePath, site);

// 3. .env mới với AUTH_SECRET ngẫu nhiên
const example = readFileSync(join(ROOT, ".env.example"), "utf8");
const secret = randomBytes(48).toString("hex");
const env = example.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${secret}"`);
writeFileSync(join(target, ".env"), env);

// 4. git init — dự án dẫn xuất có version control riêng từ đầu
try {
  execSync("git init", { cwd: target, stdio: "ignore" });
} catch {
  console.warn("Không chạy được git init — hãy tự `git init` trong thư mục đích.");
}

console.log(`Xong: ${target}`);
console.log(`- package name: ${pkg.name}`);
console.log(`- brand: ${brand}`);
console.log(`- tiền tố mã đơn: ${prefix}- (dùng chung cho mã đơn + dò nội dung CK SePay)`);
console.log(`- AUTH_SECRET: đã sinh ngẫu nhiên`);
console.log(`- git: đã init`);
console.log(`Tiếp theo trong ${target}:`);
console.log(`  1. npm install && npx prisma migrate deploy && npx tsx prisma/seed.ts`);
console.log(`  2. Đổi ADMIN_PASSWORD trong .env TRƯỚC khi seed lần đầu (prod không nhận admin123)`);
console.log(`  3. Bật/tắt module trong src/config/site.ts (features)`);
console.log(`  4. Vào /admin/cai-dat để đổi màu/logo/phí ship trên UI`);
console.log(`  5. Đổi ảnh hero + hotline + địa chỉ + tài khoản nhận CK: --hero hoặc /admin/cai-dat`);
console.log(`     (hotline/địa chỉ demo còn trong src/config/site.ts — sửa trước khi lên sản phẩm)`);
