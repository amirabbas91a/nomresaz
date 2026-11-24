import { z } from "zod";
import { handler, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { awardPoints } from "@/lib/points";
import { randomUUID } from "node:crypto";

const schema = z.object({ userId: z.string().uuid(), points: z.number().int().min(-1000).max(1000).refine((n) => n !== 0, "مقدار صفر مجاز نیست."), reason: z.string().trim().min(3, "دلیل اصلاح الزامی است.").max(300) });

export const POST = handler(async (req) => {
  const user = await needPerm("results");
  const b = schema.parse(await readJson(req));
  await awardPoints({ userId: b.userId, kind: "manual", refId: randomUUID(), points: b.points, reason: b.reason, by: user.name });
  await logAudit({ user, action: "points.adjust", entity: "users", entityId: b.userId, reason: `${b.points}: ${b.reason}` });
  return { ok: true };
});
