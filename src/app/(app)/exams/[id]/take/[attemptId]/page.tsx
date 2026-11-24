import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { stripAnswers } from "@/lib/exam";
import { ExamTaker } from "@/components/ExamTaker";

export const metadata = { title: "آزمون" };

export default async function TakeExam({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const user = await requireUser();
  await gate("exams");
  const p = await params;
  const attemptId = Number(p.attemptId);
  const examId = Number(p.id);
  if (!Number.isInteger(attemptId) || !Number.isInteger(examId)) notFound();
  const [att] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, user.id), eq(examAttempts.examId, examId)));
  if (!att) notFound();
  if (att.status !== "in_progress") redirect(`/exams/${examId}/result/${attemptId}`);
  const [exam] = await db.select().from(exams).where(eq(exams.id, examId));
  if (!exam) notFound();
  const remaining = att.startedAt.getTime() + exam.durationMin * 60_000 - Date.now();
  if (remaining <= -30_000) redirect(`/exams/${examId}`);
  return <ExamTaker attemptId={attemptId} examId={examId} title={exam.title} questions={stripAnswers(exam.questions)} initialAnswers={att.answers} remainingMs={Math.max(0, remaining)} />;
}
