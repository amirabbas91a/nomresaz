import { handler, HttpError, needFeature, needStaff, rateLimit } from "@/lib/api";
import { aiConfigured, aiVisionOcr } from "@/lib/ai";

export const maxDuration = 60;

export const POST = handler(async (req) => {
  const user = await needStaff();
  await needFeature("notebook");
  rateLimit(`ocr:${user.id}`, 30, 10 * 60_000);
  if (!aiConfigured()) throw new HttpError(503, "استخراج متن از تصویر نیازمند سرویس هوش مصنوعی است (OPENAI_API_KEY پیکربندی نشده). می‌توانید متن را دستی وارد کنید.");
  const f = (await req.formData()).get("file");
  if (!(f instanceof File)) throw new HttpError(400, "تصویری ارسال نشده است.");
  if (!["image/png", "image/jpeg", "image/webp"].includes(f.type)) throw new HttpError(415, "فقط تصویر PNG، JPEG یا WebP پذیرفته می‌شود.");
  if (f.size > 4 * 1024 * 1024) throw new HttpError(413, "حجم تصویر بیش از ۴ مگابایت است.");
  const b64 = Buffer.from(await f.arrayBuffer()).toString("base64");
  const text = await aiVisionOcr(`data:${f.type};base64,${b64}`);
  return { text, uncertain: text.includes("[؟") };
});
