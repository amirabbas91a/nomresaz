import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { features, settings } from "@/db/schema";

export type HomeSection = { key: string; title: string; visible: boolean };

export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  { key: "programs", title: "برنامه‌های ویژه", visible: true },
  { key: "announcements", title: "اطلاعیه‌ها", visible: true },
  { key: "assignments", title: "تکالیف پیش‌رو", visible: true },
  { key: "exams", title: "آزمون‌های فعال", visible: true },
  { key: "surveys", title: "نظرسنجی‌ها", visible: true },
  { key: "resources", title: "منابع تازه", visible: true },
  { key: "notebooks", title: "نکته‌نامه‌ها", visible: true },
  { key: "events", title: "رویدادهای پیش‌رو", visible: true },
  { key: "contests", title: "مسابقات", visible: true },
  { key: "ads", title: "تبلیغات", visible: true },
  { key: "ayat", title: "زندگی با آیه‌ها", visible: true },
  { key: "bale", title: "کانال بله", visible: true },
];

export const SITE_DEFAULTS = {
  siteName: "نمره‌ساز",
  tagline: "پلتفرم هوشمند آموزشی پایه نهم",
  heroTitle: "نمره‌ات را هوشمندانه بساز",
  heroText: "نکته‌نامه، آزمون آنلاین، تکلیف و منابع درسی پایه نهم در یک‌جا؛ با دستیار هوشمند و رتبه‌بندی منصفانه.",
};

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getSite() {
  return { ...SITE_DEFAULTS, ...(await getSetting<Partial<typeof SITE_DEFAULTS>>("site", {})) };
}

export async function getHomeSections() {
  const saved = await getSetting<HomeSection[]>("home_sections", []);
  const known = new Map(DEFAULT_HOME_SECTIONS.map((s) => [s.key, s]));
  const out: HomeSection[] = [];
  for (const s of saved) {
    if (known.has(s.key)) {
      out.push({ ...s });
      known.delete(s.key);
    }
  }
  return [...out, ...known.values()];
}

export async function getDisabledFeatures() {
  const rows = await db.select().from(features);
  return new Set(rows.filter((r) => !r.enabled).map((r) => r.key));
}
