import { z } from "zod";
import { handler, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { DEFAULT_HOME_SECTIONS, setSetting } from "@/lib/settings";

const schema = z.object({
  site: z.object({ siteName: z.string().trim().min(1).max(60), tagline: z.string().max(120), heroTitle: z.string().max(120), heroText: z.string().max(400) }),
  baleUrl: z.string().max(200).refine((v) => v === "" || /^https:\/\/(ble\.ir|bale\.ai)\//i.test(v), "نشانی کانال باید با https://ble.ir/ شروع شود."),
  sections: z.array(z.object({ key: z.string(), title: z.string().trim().max(60), visible: z.boolean() })).max(30),
});

export const PUT = handler(async (req) => {
  const user = await needPerm("appearance");
  const b = schema.parse(await readJson(req));
  const known = new Set(DEFAULT_HOME_SECTIONS.map((s) => s.key));
  await setSetting("site", b.site);
  await setSetting("home_sections", b.sections.filter((s) => known.has(s.key)));
  await setSetting("bale_url", b.baleUrl || "https://ble.ir/moaalem2");
  await logAudit({ user, action: "appearance.update", entity: "settings" });
  return { ok: true };
});
