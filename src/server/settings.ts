import { siteConfig, type EffectiveSite, type FeatureKey } from "@/config/site";
import { prisma } from "@/server/db";
import { unstable_cache, revalidateTag } from "next/cache";
import { z } from "zod";

/**
 * Cấu hình site hiệu lực = file `site.ts` (default) + DB `SiteSetting` (ghi đè).
 * Thứ tự ưu tiên: DB > file. Sửa trên /admin/cai-dat, áp dụng ngay không rebuild.
 *
 * Quy ước cờ tính năng:
 * - Tính tiền / tồn kho / vận chuyển (server): đọc DB qua `isFeatureOn()` → hiệu lực ngay.
 * - Ẩn/hiện giao diện (client, `isEnabled`/`isModuleOn`): đọc file lúc build → cần deploy lại.
 */

export const SETTINGS_TAG = "site-settings";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Màu hex dạng #rrggbb");

export const brandSchema = z.object({
  name: z.string().min(1, "Tên cửa hàng bắt buộc").max(80),
  tagline: z.string().max(160).default(""),
  description: z.string().max(500).default(""),
  email: z.string().max(120).default(""),
  phone: z.string().max(40).default(""),
  hotline: z.string().max(40).default(""),
  address: z.string().max(200).default(""),
  workingHours: z.string().max(120).default(""),
  logoText: z.string().min(1).max(40),
});

export const themeSchema = z.object({
  primary: hex,
  primaryHover: hex,
  accent: hex,
  ink: hex,
  muted: hex,
  canvas: hex,
  card: hex,
  line: hex,
});

export const shippingSchema = z.object({
  freeFrom: z.number().int().min(0),
  defaultFee: z.number().int().min(0),
  innerCityFee: z.number().int().min(0),
  estimatedDays: z.string().max(60),
});

export const siteSettingsInput = z.object({
  brand: brandSchema.partial().optional(),
  theme: themeSchema.partial().optional(),
  shipping: shippingSchema.partial().optional(),
  features: z.record(z.string(), z.boolean()).optional(),
});

export type { EffectiveSite };
export type SiteOverrides = {
  brand?: Partial<z.infer<typeof brandSchema>>;
  theme?: Partial<z.infer<typeof themeSchema>>;
  shipping?: Partial<z.infer<typeof shippingSchema>>;
  features?: Partial<Record<FeatureKey, boolean>>;
};

/** Pure — test được không cần DB. */
export function mergeSiteConfig(overrides: SiteOverrides): EffectiveSite {
  const pickFeatures = { ...siteConfig.features } as Record<FeatureKey, boolean>;
  if (overrides.features) {
    for (const [k, v] of Object.entries(overrides.features)) {
      if (k in pickFeatures && typeof v === "boolean") {
        pickFeatures[k as FeatureKey] = v;
      }
    }
  }
  return {
    brand: { ...siteConfig.brand, ...overrides.brand } as EffectiveSite["brand"],
    theme: { ...siteConfig.theme, ...overrides.theme } as EffectiveSite["theme"],
    shipping: { ...siteConfig.shipping, ...overrides.shipping },
    features: pickFeatures,
  };
}

function safeParse(raw: string): SiteOverrides[keyof SiteOverrides] | undefined {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? v : undefined;
  } catch {
    return undefined;
  }
}

const loadOverrides = unstable_cache(
  async (): Promise<SiteOverrides> => {
    const rows = await prisma.siteSetting.findMany();
    const out: SiteOverrides = {};
    for (const r of rows) {
      const v = safeParse(r.value);
      if (v === undefined) continue;
      if (r.key === "brand" || r.key === "theme" || r.key === "shipping" || r.key === "features") {
        (out as Record<string, unknown>)[r.key] = v;
      }
    }
    return out;
  },
  ["site-setting-rows"],
  { tags: [SETTINGS_TAG] },
);

export async function getSiteOverrides(): Promise<SiteOverrides> {
  try {
    return await loadOverrides();
  } catch {
    return {};
  }
}

export async function getEffectiveSiteConfig(): Promise<EffectiveSite> {
  return mergeSiteConfig(await getSiteOverrides());
}

/** Check cờ phía server — đọc DB, hiệu lực ngay sau khi lưu admin. */
export async function isFeatureOn(feature: FeatureKey): Promise<boolean> {
  const site = await getEffectiveSiteConfig();
  return site.features[feature];
}

export async function saveSiteSettings(input: unknown): Promise<EffectiveSite> {
  const parsed = siteSettingsInput.parse(input);
  const entries = Object.entries(parsed).filter(([, v]) => v !== undefined);
  if (!entries.length) throw new Error("Không có gì để lưu");
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(value) },
        update: { value: JSON.stringify(value) },
      }),
    ),
  );
  revalidateTag(SETTINGS_TAG, "max");
  return getEffectiveSiteConfig();
}
