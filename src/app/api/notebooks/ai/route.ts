import { z } from "zod";
import { handler, HttpError, needFeature, needStaff, rateLimit, readJson } from "@/lib/api";
import { aiConfigured, aiText } from "@/lib/ai";

export const maxDuration = 60;

const BASE =
  "تو ویراستار و سازمان‌دهنده نکته‌نامه‌های درسی پایه نهم هستی. مفهوم اصلی، اعداد، فرمول‌ها، تاریخ‌ها، نام‌ها و نکات مهم را هرگز تغییر نده و حذف نکن. بخش‌هایی که به شکل [؟ ...] علامت‌گذاری شده‌اند را حدس نزن و عیناً نگه دار. هر محتوای جدیدی که در متن اصلی نبود را فقط داخل [افزوده: ...] بنویس تا مشخص باشد. خروجی فقط متن Markdown فارسی باشد: تیتر با # و ## و ###، فهرست با - ، جدول با | ، پررنگ با **. هیچ توضیح اضافه‌ای درباره کارت ننویس.";

const MODES: Record<string, string> = {
  build: "از متن منابع، نکته‌نامه‌ای منظم بساز. سبک: {style}. درس: {subject}. ساختار: تیترها، فهرست نکات مهم و در صورت لزوم جدول.",
  fix: "فقط اشتباهات املایی، نگارشی و نیم‌فاصله را اصلاح کن. ساختار و محتوا را تغییر نده.",
  organize: "متن را بدون تغییر مفهوم، با تیتر و فهرست منظم کن و ترتیب منطقی بده.",
  simplify: "متن را ساده‌تر و روان‌تر بازنویسی کن بدون حذف نکات و اعداد.",
  summarize: "متن را خلاصه کن، اما همه نکات کلیدی، اعداد و فرمول‌ها باید بمانند.",
  title: "فقط ۳ عنوان پیشنهادی کوتاه برای این متن بنویس، هر کدام در یک خط.",
  ambiguity: "بخش‌های مبهم، ناقص یا متناقض متن را فهرست کن و برای هرکدام توضیح بده. متن را بازنویسی نکن.",
};

const body = z.object({ mode: z.enum(["build", "fix", "organize", "simplify", "summarize", "title", "ambiguity"]), text: z.string().trim().min(1, "متنی برای پردازش وجود ندارد.").max(30000), style: z.string().max(30).optional(), subject: z.string().max(100).optional() });

export const POST = handler(async (req) => {
  const user = await needStaff();
  await needFeature("notebook");
  rateLimit(`nbai:${user.id}`, 30, 10 * 60_000);
  if (!aiConfigured()) throw new HttpError(503, "ویراستار هوشمند نیازمند سرویس هوش مصنوعی است (OPENAI_API_KEY پیکربندی نشده).");
  const b = body.parse(await readJson(req));
  const styleName = { full: "کامل", summary: "خلاصه", exam: "مرور امتحانی", custom: "دلخواه" }[b.style ?? "full"] ?? "کامل";
  const instruction = MODES[b.mode].replace("{style}", styleName).replace("{subject}", b.subject || "نامشخص");
  const text = await aiText(`${BASE}\n\nدستور: ${instruction}`, b.text, 0.2);
  return { text };
});
