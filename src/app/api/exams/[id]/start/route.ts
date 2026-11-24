import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { handler, HttpError, needFeature, needUser } from "@/lib/api";

export const POST = handler<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await needUser();
  await needFeature("exams");
  const id = Number((await ctx.params).id);
  const [exam] = await db.select().from(exams).where(eq(exams.id, id));
  if (!exam || exam.status !== "published") throw new HttpError(404, "آزمون یافت نشد.");
  const now = new Date();
  if (exam.startsAt && exam.startsAt > now) throw new HttpError(403, "آزمون هنوز شروع نشده است.");
  if (exam.endsAt && exam.endsAt < now) throw new HttpError(403, "مهلت آزمون به پایان رسیده است.");

  // resume an unexpired in-progress attempt
  const [open] = await db.select().from(examAttempts).where(and(eq(examAttempts.examId, id), eq(examAttempts.userId, user.id), eq(examAttempts.status, "in_progress"))).orderBy(desc(examAttempts.id)).limit(1);
  if (open && open.startedAt.getTime() + exam.durationMin * 60_000 + 30_000 > now.getTime()) return { attemptId: open.id };

  const [{ n }] = await db.select({ n: count() }).from(examAttempts).where(and(eq(examAttempts.examId, id), eq(examAttempts.userId, user.id)));
  if (n >= exam.maxAttempts) throw new HttpError(403, "تعداد دفعات مجاز شرکت در این آزمون تمام شده است.");
  const [row] = await db.insert(examAttempts).values({ examId: id, userId: user.id, maxScore: exam.questions.reduce((s, q) => s + q.marks, 0) }).returning({ id: examAttempts.id });
  return { attemptId: row.id };
});
