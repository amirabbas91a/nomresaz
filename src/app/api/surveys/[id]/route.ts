import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { surveys } from "@/db/schema";
import { handler, HttpError, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  title: z.string().trim().min(2, "عنوان را وارد کنید.").max(200),
  description: z.string().max(2000).nullable().optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  endsAt: z.string().datetime({ offset: true }).nullable().optional(),
  anonymous: z.boolean(),
  status: z.enum(["draft", "published", "archived"]),
  questions: z.array(z.object({
    id: z.string().min(1).max(30), type: z.enum(["single", "multi", "text", "scale"]), text: z.string().trim().min(1, "متن پرسش خالی است.").max(500),
    options: z.array(z.string().trim().min(1).max(200)).max(12).optional(), required: z.boolean().optional(),
  })).max(50),
});

export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await needPerm("surveys");
  const id = Number((await ctx.params).id);
  const b = schema.parse(await readJson(req));
  if (b.status === "published") {
    if (b.questions.length === 0) throw new HttpError(400, "نظرسنجی بدون پرسش قابل انتشار نیست.");
    for (const q of b.questions) if ((q.type === "single" || q.type === "multi") && (q.options?.length ?? 0) < 2) throw new HttpError(400, "پرسش‌های گزینه‌ای حداقل دو گزینه لازم دارند.");
  }
  const [row] = await db.update(surveys).set({ ...b, description: b.description ?? null, startsAt: b.startsAt ? new Date(b.startsAt) : null, endsAt: b.endsAt ? new Date(b.endsAt) : null }).where(eq(surveys.id, id)).returning({ id: surveys.id });
  if (!row) throw new HttpError(404, "یافت نشد.");
  await logAudit({ user, action: "surveys.update", entity: "surveys", entityId: id, reason: `status=${b.status}` });
  return { ok: true };
});

export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await needPerm("surveys");
  const id = Number((await ctx.params).id);
  await db.delete(surveys).where(eq(surveys.id, id));
  await logAudit({ user, action: "surveys.delete", entity: "surveys", entityId: id });
  return { ok: true };
});
