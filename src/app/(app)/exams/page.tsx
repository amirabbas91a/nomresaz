import Link from "next/link";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { Clock, HelpCircle } from "lucide-react";
import { db } from "@/db";
import { examAttempts, exams, subjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { fa, formatJalali } from "@/lib/jalali";
import { Empty, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";

export const metadata = { title: "آزمون‌ها" };

export default async function ExamsPage() {
  const user = await requireUser();
  await gate("exams");
  const now = new Date();
  const rows = await db.select({ e: exams, sub: subjects.name }).from(exams).leftJoin(subjects, eq(subjects.id, exams.subjectId))
    .where(and(eq(exams.status, "published"), or(isNull(exams.endsAt), gte(exams.endsAt, new Date(now.getTime() - 30 * 86400_000))))).orderBy(desc(exams.createdAt));
  const mine = await db.select().from(examAttempts).where(eq(examAttempts.userId, user.id)).orderBy(desc(examAttempts.startedAt));
  const active = rows.filter(({ e }) => (!e.startsAt || e.startsAt <= now) && (!e.endsAt || e.endsAt >= now));
  const other = rows.filter((r) => !active.includes(r));
  void lte;
  const card = ({ e, sub }: (typeof rows)[number], enabled: boolean) => {
    const my = mine.filter((m) => m.examId === e.id && m.status !== "in_progress");
    return (
      <Link key={e.id} href={`/exams/${e.id}`} className="glass card-hover fade-up block p-5">
        <div className="flex items-start justify-between gap-2"><h3 className="m-0 font-extrabold">{e.title}</h3>{sub && <span className="badge badge-info">{sub}</span>}</div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted"><span className="inline-flex items-center gap-1"><Clock size={14} />{fa(e.durationMin)} دقیقه</span><span className="inline-flex items-center gap-1"><HelpCircle size={14} />{fa(e.questions.length)} سؤال</span>{e.endsAt && <span>تا {formatJalali(e.endsAt, true)}</span>}</div>
        <div className="mt-3 flex items-center gap-2">{my.length > 0 && <span className="badge badge-ok">{fa(my.length)} بار شرکت کرده‌ای</span>}{!enabled && <span className="badge">خارج از بازه</span>}</div>
      </Link>
    );
  };
  return (
    <>
      <PageHeader title="آزمون‌ها" subtitle="آزمون‌های آنلاین با تصحیح خودکار" />
      <SectionTitle>آزمون‌های در دسترس</SectionTitle>
      {active.length === 0 ? <Empty title="آزمون فعالی وجود ندارد" /> : <div className="grid gap-4 md:grid-cols-2">{active.map((r) => card(r, true))}</div>}
      {other.length > 0 && <><div className="mt-8" /><SectionTitle>آزمون‌های بسته‌شده یا آینده</SectionTitle><div className="grid gap-4 md:grid-cols-2">{other.map((r) => card(r, false))}</div></>}
      {mine.length > 0 && (
        <section className="mt-8"><SectionTitle>سوابق من</SectionTitle>
          <div className="glass-solid tbl-wrap"><table className="tbl"><tbody>
            {mine.filter((m) => m.status !== "in_progress").slice(0, 15).map((m) => (
              <tr key={m.id}><td className="font-semibold">{rows.find((r) => r.e.id === m.examId)?.e.title ?? "آزمون"}</td><td><StatusBadge status={m.status} /></td><td>{m.score !== null ? `${fa(m.score)} از ${fa(m.maxScore)}` : "—"}</td><td className="text-xs text-muted">{formatJalali(m.submittedAt, true)}</td><td><Link className="text-sm font-bold text-brand" href={`/exams/${m.examId}/result/${m.id}`}>جزئیات</Link></td></tr>
            ))}</tbody></table></div>
        </section>
      )}
    </>
  );
}
