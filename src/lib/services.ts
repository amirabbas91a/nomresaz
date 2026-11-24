import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getSetting } from "./settings";

export type ServiceState = "connected" | "unconfigured" | "configured" | "error";
export type ServiceInfo = { key: string; label: string; state: ServiceState; detail: string; testable: boolean };

export const aiConfigured = () => !!process.env.OPENAI_API_KEY;

export async function getServices(): Promise<ServiceInfo[]> {
  const tests = await getSetting<Record<string, { ok: boolean; at: string; msg?: string }>>("service_tests", {});
  let dbOk = true;
  try {
    await db.execute(sql`select 1`);
  } catch {
    dbOk = false;
  }
  const fromTest = (key: string, configured: boolean, name: string): Pick<ServiceInfo, "state" | "detail"> => {
    if (!configured) return { state: "unconfigured", detail: `پیکربندی نشده — متغیر محیطی ${name} را تنظیم کنید.` };
    const t = tests[key];
    if (!t) return { state: "configured", detail: "کلید تنظیم شده؛ هنوز آزمایش نشده است." };
    return t.ok ? { state: "connected", detail: "اتصال آزمایش و تأیید شد." } : { state: "error", detail: t.msg ?? "آخرین آزمایش ناموفق بود." };
  };
  return [
    { key: "db", label: "پایگاه داده PostgreSQL", state: dbOk ? "connected" : "error", detail: dbOk ? "متصل" : "عدم پاسخ‌گویی پایگاه داده", testable: false },
    { key: "storage", label: "ذخیره‌سازی فایل", state: dbOk ? "connected" : "error", detail: "فایل‌ها در PostgreSQL ذخیره می‌شوند (حداکثر ۴ مگابایت هر فایل).", testable: false },
    { key: "ai", label: "هوش مصنوعی (دستیار، OCR، تبدیل گفتار، ویراستار)", ...fromTest("ai", aiConfigured(), "OPENAI_API_KEY"), testable: aiConfigured() },
    { key: "bale", label: "ربات بله (ارسال به کانال)", ...fromTest("bale", !!process.env.BALE_BOT_TOKEN && !!process.env.BALE_CHAT_ID, "BALE_BOT_TOKEN و BALE_CHAT_ID"), testable: !!process.env.BALE_BOT_TOKEN },
  ];
}

export const SERVICE_STATE_LABEL: Record<ServiceState, { label: string; cls: string }> = {
  connected: { label: "متصل و آزمایش‌شده", cls: "badge badge-ok" },
  configured: { label: "پیکربندی‌شده، آزمایش‌نشده", cls: "badge badge-info" },
  unconfigured: { label: "پیکربندی نشده", cls: "badge" },
  error: { label: "خطادار", cls: "badge badge-danger" },
};
