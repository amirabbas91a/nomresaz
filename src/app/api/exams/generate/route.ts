import { z } from "zod";
import { handler, HttpError, needPerm, rateLimit, readJson } from "@/lib/api";
import { aiConfigured, chatCompletion } from "@/lib/ai";
import { questionSchema } from "@/lib/exam";
import { logAudit } from "@/lib/audit";
import { uid } from "@/lib/utils";

const body = z.object({ source: z.string().trim().min(80, "متن منبع حداقل ۸۰ نویسه باشد.").max(12000), count: z.number().int().min(1).max(20).default(5) });

export const POST = handler(async (req) => {
  const user = await needPerm("exams");
  rateLimit(`examgen:${user.id}`, 10, 10 * 60_000);
  if (!aiConfigured()) throw new HttpError(503, "سرویس هوش مصنوعی پیکربندی نشده است؛ ابتدا OPENAI_API_KEY را تنظیم کنید.");
  const b = body.parse(await readJson(req));
  const r = await chatCompletion({
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "تو طراح سؤال برای دانش‌آموزان پایه نهم ایران هستی. فقط و فقط بر اساس «متن منبع» سؤال بساز و هیچ اطلاعات بیرون از متن اضافه نکن. سؤال مبهم یا غیرقابل پاسخ از متن را تولید نکن. خروجی را فقط به صورت JSON با کلید questions بده. هر سؤال: {type: 'mcq'|'tf'|'blank'|'short', text, options (فقط برای mcq، چهار گزینه منطقی), correct (برای mcq اندیس صفر-مبنا، برای tf مقدار boolean، برای blank/short پاسخ متنی), explanation (توضیح کوتاه بر اساس متن), marks: 1}. زبان: فارسی.",
      },
      { role: "user", content: `تعداد سؤال: ${b.count}\n\nمتن منبع:\n${b.source}` },
    ],
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.choices[0]?.message.content ?? "{}");
  } catch {
    throw new HttpError(502, "خروجی هوش مصنوعی قابل پردازش نبود.");
  }
  const raw = (parsed as { questions?: unknown[] }).questions ?? [];
  const questions = raw
    .map((q) => questionSchema.safeParse({ ...(q as object), id: uid(), marks: 1 }))
    .filter((x) => x.success)
    .map((x) => x.data);
  await logAudit({ user, action: "exams.ai_generate", entity: "exams", reason: `generated=${questions.length}` });
  if (questions.length === 0) throw new HttpError(422, "سؤال معتبری تولید نشد. متن منبع را دقیق‌تر کنید.");
  return { questions };
});
