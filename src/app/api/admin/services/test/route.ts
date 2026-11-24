import { z } from "zod";
import { handler, HttpError, needPerm, rateLimit, readJson } from "@/lib/api";
import { aiBase } from "@/lib/ai";
import { testBale } from "@/lib/bale";
import { getSetting, setSetting } from "@/lib/settings";
import { logAudit } from "@/lib/audit";

export const POST = handler(async (req) => {
  const user = await needPerm("settings");
  rateLimit(`svc:${user.id}`, 10, 10 * 60_000);
  const { key } = z.object({ key: z.enum(["ai", "bale"]) }).parse(await readJson(req));
  let r: { ok: boolean; msg?: string };
  if (key === "ai") {
    if (!process.env.OPENAI_API_KEY) throw new HttpError(400, "OPENAI_API_KEY تنظیم نشده است.");
    try {
      const res = await fetch(`${aiBase()}/models`, { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, signal: AbortSignal.timeout(15_000) });
      r = res.ok ? { ok: true } : { ok: false, msg: `پاسخ ناموفق از سرویس (کد ${res.status}).` };
    } catch {
      r = { ok: false, msg: "عدم اتصال به سرویس هوش مصنوعی." };
    }
  } else r = await testBale();
  const tests = await getSetting<Record<string, unknown>>("service_tests", {});
  await setSetting("service_tests", { ...tests, [key]: { ok: r.ok, at: new Date().toISOString(), msg: r.msg } });
  await logAudit({ user, action: `services.test.${key}`, result: r.ok ? "ok" : "failed", reason: r.msg });
  return r;
});
