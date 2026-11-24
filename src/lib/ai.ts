import "server-only";
import { HttpError } from "./api";

export const aiConfigured = () => !!process.env.OPENAI_API_KEY;
export const aiBase = () => (process.env.OPENAI_BASE_URL?.replace(/\/$/, "") || "https://api.openai.com/v1");
export const aiModel = () => process.env.OPENAI_MODEL || "gpt-4o-mini";

function key() {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new HttpError(503, "سرویس هوش مصنوعی پیکربندی نشده است (متغیر OPENAI_API_KEY).");
  return k;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function chatCompletion(body: { messages: any[]; tools?: any[]; response_format?: any; temperature?: number }) {
  const res = await fetch(`${aiBase()}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: aiModel(), ...body }),
    signal: AbortSignal.timeout(55_000),
  }).catch(() => {
    throw new HttpError(504, "اتصال به سرویس هوش مصنوعی برقرار نشد.");
  });
  if (!res.ok) {
    console.error("AI error status", res.status);
    throw new HttpError(502, `سرویس هوش مصنوعی خطا برگرداند (کد ${res.status}).`);
  }
  return (await res.json()) as {
    choices: { message: { content: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
  };
}

export async function aiText(system: string, user: string, temperature = 0.2) {
  const r = await chatCompletion({ messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature });
  return r.choices[0]?.message.content ?? "";
}

export async function aiVisionOcr(dataUrl: string) {
  const r = await chatCompletion({
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "تو یک ابزار OCR دقیق برای متن فارسی هستی. فقط متن موجود در تصویر را بازنویسی کن. تیترها را با # و فهرست‌ها را با - و جدول‌ها را با قالب | ستون | ستون | بنویس. اگر بخشی ناخوانا یا مشکوک بود آن را حدس نزن و به صورت [؟ ...] علامت بزن. هیچ توضیح اضافه‌ای ندهید.",
      },
      { role: "user", content: [{ type: "text", text: "متن این تصویر را استخراج کن." }, { type: "image_url", image_url: { url: dataUrl } }] },
    ],
  });
  return r.choices[0]?.message.content ?? "";
}

export async function aiTranscribe(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("model", process.env.OPENAI_STT_MODEL || "whisper-1");
  fd.append("language", "fa");
  const res = await fetch(`${aiBase()}/audio/transcriptions`, { method: "POST", headers: { Authorization: `Bearer ${key()}` }, body: fd, signal: AbortSignal.timeout(55_000) }).catch(() => {
    throw new HttpError(504, "اتصال به سرویس تبدیل گفتار برقرار نشد.");
  });
  if (!res.ok) throw new HttpError(502, `سرویس تبدیل گفتار خطا برگرداند (کد ${res.status}).`);
  return ((await res.json()) as { text?: string }).text ?? "";
}
