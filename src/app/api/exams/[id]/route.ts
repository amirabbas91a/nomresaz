import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exams } from "@/db/schema";
import { handler, HttpError, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { examSchema, publishProblem } from "@/lib/exam";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await needPerm("exams");
  const id = Number((await ctx.params).id);
  const b = examSchema.parse(await readJson(req));
  if (b.status === "published") {
    const p = publishProblem(b.questions);
    if (p) throw new HttpError(400, p);
  }
  if (b.startsAt && b.endsAt && new Date(b.endsAt) <= new Date(b.startsAt)) throw new HttpError(400, "پایان آزمون باید بعد از شروع باشد.");
  const [row] = await db
    .update(exams)
    .set({
      title: b.title, description: b.description ?? null, subjectId: b.subjectId ?? null, chapter: b.chapter ?? null,
      durationMin: b.durationMin, maxAttempts: b.maxAttempts, startsAt: b.startsAt ? new Date(b.startsAt) : null, endsAt: b.endsAt ? new Date(b.endsAt) : null,
      showResult: b.showResult, awardPoints: b.awardPoints, status: b.status, questions: b.questions,
    })
    .where(eq(exams.id, id))
    .returning({ id: exams.id });
  if (!row) throw new HttpError(404, "آزمون یافت نشد.");
  await logAudit({ user, action: "exams.update", entity: "exams", entityId: id, reason: `status=${b.status}, questions=${b.questions.length}` });
  return { ok: true };
});

export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await needPerm("exams");
  const id = Number((await ctx.params).id);
  await db.delete(exams).where(eq(exams.id, id));
  await logAudit({ user, action: "exams.delete", entity: "exams", entityId: id });
  return { ok: true };
});
