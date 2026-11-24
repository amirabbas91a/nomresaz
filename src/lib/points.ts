import "server-only";
import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignmentDone, contestEntries, examAttempts, notes, pointEvents, userBadges } from "@/db/schema";

export const BADGES = [
  { key: "first_exam", name: "اولین آزمون", description: "نخستین آزمون خود را به پایان رساندید." },
  { key: "five_exams", name: "پنج آزمون", description: "پنج آزمون را کامل کردید." },
  { key: "high_score", name: "نمره درخشان", description: "در یک آزمون حداقل ۹۰٪ نمره گرفتید." },
  { key: "contest_joined", name: "مسابقه‌دهنده", description: "در یک مسابقه شرکت کردید." },
  { key: "diligent", name: "کوشا", description: "پنج تکلیف را انجام‌شده ثبت کردید." },
  { key: "note_taker", name: "یادداشت‌بردار", description: "نخستین یادداشت خود را نوشتید." },
];

/** Awards points once per (user, kind, refId). Returns true if newly awarded. */
export async function awardPoints(p: { userId: string; kind: string; refId: string | number; points: number; reason?: string; by?: string }) {
  if (p.points === 0) return false;
  const res = await db
    .insert(pointEvents)
    .values({ userId: p.userId, kind: p.kind, refId: String(p.refId), points: p.points, reason: p.reason, createdBy: p.by })
    .onConflictDoNothing()
    .returning({ id: pointEvents.id });
  return res.length > 0;
}

export async function checkBadges(userId: string) {
  const [ex] = await db
    .select({ n: count() })
    .from(examAttempts)
    .where(and(eq(examAttempts.userId, userId), sql`${examAttempts.status} in ('submitted','graded')`));
  const [hi] = await db
    .select({ n: count() })
    .from(examAttempts)
    .where(and(eq(examAttempts.userId, userId), eq(examAttempts.status, "graded"), sql`${examAttempts.maxScore} > 0 and ${examAttempts.score} / ${examAttempts.maxScore} >= 0.9`));
  const [ct] = await db.select({ n: count() }).from(contestEntries).where(eq(contestEntries.userId, userId));
  const [as] = await db.select({ n: count() }).from(assignmentDone).where(eq(assignmentDone.userId, userId));
  const [nt] = await db.select({ n: count() }).from(notes).where(eq(notes.userId, userId));
  const earned: string[] = [];
  if (ex.n >= 1) earned.push("first_exam");
  if (ex.n >= 5) earned.push("five_exams");
  if (hi.n >= 1) earned.push("high_score");
  if (ct.n >= 1) earned.push("contest_joined");
  if (as.n >= 5) earned.push("diligent");
  if (nt.n >= 1) earned.push("note_taker");
  if (earned.length)
    await db.insert(userBadges).values(earned.map((badgeKey) => ({ userId, badgeKey }))).onConflictDoNothing();
}
