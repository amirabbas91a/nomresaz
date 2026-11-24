import { z } from "zod";
import { db } from "@/db";
import { features } from "@/db/schema";
import { handler, HttpError, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { FEATURES } from "@/lib/features";

export const POST = handler(async (req) => {
  const user = await needPerm("settings");
  const b = z.object({ key: z.string(), enabled: z.boolean() }).parse(await readJson(req));
  if (!FEATURES.some((f) => f.key === b.key && f.togglable)) throw new HttpError(400, "این قابلیت قابل فعال/غیرفعال‌سازی نیست.");
  await db.insert(features).values({ key: b.key, enabled: b.enabled }).onConflictDoUpdate({ target: features.key, set: { enabled: b.enabled } });
  await logAudit({ user, action: b.enabled ? "features.enable" : "features.disable", entity: "features", entityId: b.key }); // data is kept; only access is gated
  return { ok: true };
});
