import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, ne, and } from "drizzle-orm";
import { db } from "@/db";
import { examAttempts, exams, users } from "@/db/schema";
import { hasPerm, requireAdminPage } from "@/lib/auth";
import { fa, formatJalali } from "@/lib/jalali";
import { GradeForm } from "@/components/GradeForm";
import { Empty, PageHeader, StatCard, StatusBadge } from "@/components/ui";

export default async function ExamResults({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage("exams");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [exam] = await db.select().from(exams).where(eq(exams.id, id));
  if (!exam) notFound();
  const rows = await db.select({ a: examAttempts, name: users.name }).from(examAttempts).innerJoin(users, eq(users.id, examAttempts.userId)).where(and(eq(examAttempts.examId, id), ne(examAttempts.status, "in_progress"))).orderBy(desc(examAttempts.submittedAt));
  const graded = rows.filter((r) => r.a.status === "graded" && r.a.maxScore > 0);
  const avg = graded.length ? graded.reduce((s, r) => s + ((r.a.score ?? 0) / r.a.maxScore) * 100, 0) / graded.length : null;
  const essays = exam.questions.filter((q) => q.type === "essay");
  const canGrade = hasPerm(admin, "results");
  return (
    <>
      <PageHeader title={`نتایج: ${exam.title}`} actions={<Link href={`/admin/exams/${id}`} className="btn">ویرایش آزمون</Link>} />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="تعداد ارسال‌ها" value={rows.length} />
        <StatCard label="در انتظار تصحیح" value={rows.filter((r) => r.a.status === "submitted").length} tone="warn" />
        <StatCard label="میانگین درصد" value={avg === null ? "—" : `${fa(Math.round(avg))}٪`} tone="teal" />
      </div>
      {rows.length === 0 ? <Empty title="هنوز ارسالی ثبت نشده" /> : (
        <div className="glass-solid tbl-wrap"><table className="tbl"><thead><tr><th>دانش‌آموز</th><th>نمره</th><th>وضعیت</th><th>ارسال</th><th></th></tr></thead><tbody>
          {rows.map(({ a, name }) => (
            <tr key={a.id}><td className="font-bold">{name}</td><td>{a.score === null ? "—" : `${fa(a.score)} از ${fa(a.maxScore)}`}</td><td><StatusBadge status={a.status} /></td><td className="text-xs text-muted">{formatJalali(a.submittedAt, true)}</td>
              <td>{canGrade && essays.length > 0 && <GradeForm attemptId={a.id} student={name} items={essays.map((q) => ({ id: q.id, text: q.text, marks: q.marks, answer: String(a.answers[q.id] ?? ""), current: a.manualScores[q.id] }))} />}</td></tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
