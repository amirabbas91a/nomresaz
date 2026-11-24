import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { handler, HttpError, needFeature, needUser, readJson } from "@/lib/api";
import { finalizeAttempt } from "@/lib/exam-server";

type Ctx = { params: Promise<{ id: string }> };
const body = z.object({ answers: z.record(z.string().max(30), z.unknown()).optional(), submit: z.boolean().optional() });
const GRACE = 30_000;

async function load(id: number, userId: string) {
  const [att] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, id), eq(examAttempts.userId, userId)));
  if (!att) throw new HttpError(404, "تلاش آزمون یافت نشد.");
  const [exam] = await db.select().from(exams).where(eq(exams.id, att.examId));
  if (!exam) throw new HttpError(404, "آزمون یافت نشد.");
  return { att, exam };
}

function cleanAnswers(raw: Record<string, unknown>, questionIds: Set<string>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!questionIds.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 5000);
    else if (typeof v === "number" || typeof v === "boolean") out[k] = v;
    else if (Array.isArray(v) && v.every((x) => typeof x === "number")) out[k] = v.slice(0, 10);
  }
  return out;
}

export const POST = handler<Ctx>(async (req, ctx) => {
  const user = await needUser();
  await needFeature("exams");
  const id = Number((await ctx.params).id);
  const b = body.parse(await readJson(req));
  const { att, exam } = await load(id, user.id);
  if (att.status !== "in_progress") throw new HttpError(409, "این آزمون قبلاً ارسال شده است.");
  const expired = Date.now() > att.startedAt.getTime() + exam.durationMin * 60_000 + GRACE;

  if (!b.submit) {
    if (expired) throw new HttpError(409, "زمان آزمون به پایان رسیده است.");
    const answers = cleanAnswers(b.answers ?? {}, new Set(exam.questions.map((q) => q.id)));
    await db.update(examAttempts).set({ answers }).where(and(eq(examAttempts.id, id), eq(examAttempts.status, "in_progress")));
    return { saved: true };
  }

  // Atomic transition prevents double submission.
  const answers = expired ? att.answers : { ...att.answers, ...cleanAnswers(b.answers ?? {}, new Set(exam.questions.map((q) => q.id))) };
  const moved = await db
    .update(examAttempts)
    .set({ answers, submittedAt: new Date(), status: "submitted" })
    .where(and(eq(examAttempts.id, id), eq(examAttempts.status, "in_progress")))
    .returning({ id: examAttempts.id });
  if (moved.length === 0) throw new HttpError(409, "این آزمون قبلاً ارسال شده است.");
  await finalizeAttempt(id);
  return { submitted: true };
});
