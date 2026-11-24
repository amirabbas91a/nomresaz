import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examAttempts } from "@/db/schema";
import { handler, HttpError, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { finalizeAttempt } from "@/lib/exam-server";

export const POST = handler<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await needPerm("results");
  const id = Number((await ctx.params).id);
  const { scores } = z.object({ scores: z.record(z.string().max(30), z.number().min(0).max(100)) }).parse(await readJson(req));
  const [att] = await db.select().from(examAttempts).where(eq(examAttempts.id, id));
  if (!att || att.status === "in_progress") throw new HttpError(404, "تلاش قابل تصحیح یافت نشد.");
  await db.update(examAttempts).set({ manualScores: { ...att.manualScores, ...scores } }).where(eq(examAttempts.id, id));
  const r = await finalizeAttempt(id);
  await logAudit({ user, action: "attempts.grade", entity: "exam_attempts", entityId: id });
  return { result: r };
});
