import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { computeAttempt } from "./exam";
import { awardPoints, checkBadges } from "./points";

/** Recomputes score from stored answers + manual scores, updates status and awards points once. */
export async function finalizeAttempt(attemptId: number) {
  const [att] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId));
  if (!att || att.status === "in_progress") return null;
  const [exam] = await db.select().from(exams).where(eq(exams.id, att.examId));
  if (!exam) return null;
  const r = computeAttempt(exam.questions, att.answers, att.manualScores);
  const status = r.pending ? "submitted" : "graded";
  await db.update(examAttempts).set({ score: r.score, maxScore: r.max, status }).where(eq(examAttempts.id, attemptId));
  if (status === "graded" && exam.awardPoints > 0 && r.max > 0) {
    const pts = Math.round((exam.awardPoints * r.score) / r.max);
    await awardPoints({ userId: att.userId, kind: "exam", refId: exam.id, points: pts, reason: `آزمون «${exam.title}»` });
  }
  await checkBadges(att.userId);
  return { status, score: r.score, max: r.max };
}
