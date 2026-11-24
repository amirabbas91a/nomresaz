import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";
import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { computeAttempt } from "@/lib/exam";
import { fa } from "@/lib/jalali";
import { PageHeader, StatCard } from "@/components/ui";

export const metadata = { title: "نتیجه آزمون" };

export default async function ExamResult({ params }: { params: Promise<{ id: string; attemptId: string }> }) {
  const user = await requireUser();
  await gate("exams");
  const p = await params;
  const [att] = await db.select().from(examAttempts).where(and(eq(examAttempts.id, Number(p.attemptId)), eq(examAttempts.userId, user.id)));
  if (!att) notFound();
  const [exam] = await db.select().from(exams).where(eq(exams.id, att.examId));
  if (!exam) notFound();
  if (att.status === "in_progress") notFound();
  const r = computeAttempt(exam.questions, att.answers, att.manualScores);
  const pct = r.max > 0 ? Math.round((r.score / r.max) * 100) : 0;
  return (
    <>
      <PageHeader title={`نتیجه: ${exam.title}`} actions={<Link href="/exams" className="btn">بازگشت به آزمون‌ها</Link>} />
      <div className="mb-6 rounded-[var(--radius)]">
        {!exam.showResult ? (
          <div className="glass p-6 text-center"><CheckCircle2 className="mx-auto text-ok" size={36} /><p className="font-bold">پاسخ‌های شما ثبت شد.</p><p className="m-0 text-sm text-muted">نمایش نتیجه برای این آزمون توسط مدیر غیرفعال شده است.</p></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard label="نمره" value={`${fa(r.score)} از ${fa(r.max)}`} tone="brand" />
            <StatCard label="درصد" value={`${fa(pct)}٪`} tone="teal" />
            <StatCard label="وضعیت" value={att.status === "graded" ? "تصحیح‌شده" : "در انتظار تصحیح تشریحی"} tone="warn" />
          </div>
        )}
      </div>
      {att.status === "submitted" && exam.showResult && <div className="badge badge-warn mb-4 !rounded-xl !px-3 !py-2"><Hourglass size={15} />نمره نهایی پس از تصحیح سؤال‌های تشریحی توسط مدیر مشخص می‌شود.</div>}
      {exam.showResult && (
        <div className="grid gap-3">
          {exam.questions.map((q, i) => {
            const got = r.detail[q.id];
            const ok = got !== null && got === q.marks;
            return (
              <article key={q.id} className="glass-solid p-5">
                <div className="flex items-start gap-3">
                  {got === null ? <Hourglass className="text-warn" size={20} /> : ok ? <CheckCircle2 className="text-ok" size={20} /> : <XCircle className="text-danger" size={20} />}
                  <div className="flex-1"><div className="font-bold">{fa(i + 1)}. {q.text}</div>
                    <div className="mt-1 text-sm text-muted">پاسخ شما: {answerText(q, att.answers[q.id])}</div>
                    {!ok && q.type !== "essay" && <div className="text-sm text-ok">پاسخ صحیح: {answerText(q, q.correct)}</div>}
                    {q.explanation && <p className="mb-0 mt-2 rounded-xl bg-[var(--brand-soft)] p-3 text-sm">{q.explanation}</p>}</div>
                  <span className="badge">{got === null ? "؟" : fa(got)} / {fa(q.marks)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function answerText(q: { type: string; options?: string[] }, v: unknown): string {
  if (v === undefined || v === null || v === "") return "بدون پاسخ";
  if (q.type === "mcq") return typeof v === "number" ? (q.options?.[v] ?? "—") : "—";
  if (q.type === "multi") return Array.isArray(v) ? v.map((i) => q.options?.[i as number]).filter(Boolean).join("، ") || "بدون پاسخ" : "—";
  if (q.type === "tf") return v === true ? "درست" : "نادرست";
  return String(v);
}
