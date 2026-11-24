import "server-only";

export const baleConfigured = () => !!process.env.BALE_BOT_TOKEN && !!process.env.BALE_CHAT_ID;

/** Official Bale Bot API (https://tapi.bale.ai). The bot must be an admin of the channel. */
export async function sendToBale(text: string): Promise<{ ok: boolean; error?: string }> {
  if (!baleConfigured()) return { ok: false, error: "ربات بله پیکربندی نشده است (BALE_BOT_TOKEN / BALE_CHAT_ID)." };
  try {
    const res = await fetch(`https://tapi.bale.ai/bot${process.env.BALE_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.BALE_CHAT_ID, text }),
      signal: AbortSignal.timeout(15_000),
    });
    const j = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    return res.ok && j.ok ? { ok: true } : { ok: false, error: j.description ?? `کد ${res.status}` };
  } catch {
    return { ok: false, error: "عدم اتصال به سرویس بله." };
  }
}

export async function testBale(): Promise<{ ok: boolean; msg?: string }> {
  if (!process.env.BALE_BOT_TOKEN) return { ok: false, msg: "BALE_BOT_TOKEN تنظیم نشده است." };
  try {
    const res = await fetch(`https://tapi.bale.ai/bot${process.env.BALE_BOT_TOKEN}/getMe`, { signal: AbortSignal.timeout(15_000) });
    return res.ok ? { ok: true } : { ok: false, msg: `پاسخ ناموفق (کد ${res.status}).` };
  } catch {
    return { ok: false, msg: "عدم اتصال به سرویس بله." };
  }
}
