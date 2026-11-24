import { handler, HttpError, needFeature, needStaff, rateLimit } from "@/lib/api";
import { aiConfigured, aiTranscribe } from "@/lib/ai";

export const maxDuration = 60;

export const POST = handler(async (req) => {
  const user = await needStaff();
  await needFeature("notebook");
  rateLimit(`stt:${user.id}`, 30, 10 * 60_000);
  if (!aiConfigured()) throw new HttpError(503, "تبدیل گفتار به متن نیازمند سرویس هوش مصنوعی است (OPENAI_API_KEY پیکربندی نشده).");
  const f = (await req.formData()).get("file");
  if (!(f instanceof File)) throw new HttpError(400, "فایل صوتی ارسال نشده است.");
  if (!f.type.startsWith("audio/") && !f.type.startsWith("video/mp4")) throw new HttpError(415, "فقط فایل صوتی پذیرفته می‌شود.");
  if (f.size > 4 * 1024 * 1024) throw new HttpError(413, "حجم فایل صوتی بیش از ۴ مگابایت است؛ بخش‌های کوتاه‌تر ضبط کنید.");
  const text = await aiTranscribe(f);
  return { text };
});
