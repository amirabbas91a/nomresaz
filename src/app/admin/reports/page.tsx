import { count, desc, eq, sql } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { assignmentDone, auditLogs, contestEntries, examAttempts, exams, notes, notebooks, resources, roles, surveyResponses, surveys, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { fa } from "@/lib/jalali";
import { BarChart, Empty, PageHeader, SectionTitle, StatCard } from "@/components/ui";

export const metadata = { title: "گزارش‌ها" };

export default async function Reports() {
  const me = await requireAdminPage("audit");
  const byRole = await db.select({ name: roles.name, n: count(users.id) }).from(users).innerJoin(roles, eq(roles.key, users.roleKey)).groupBy(roles.name);
  const exam = await db.select({ title: exams.title, n: count(examAttempts.id), avg: sql<number | null>`avg(case when ${examAttempts.status}='graded' and ${examAttempts.maxScore}>0 then ${examAttempts.score}/${examAttempts.maxScore}*100 end)` }).from(exams).leftJoin(examAttempts, eq(examAttempts.examId, exams.id)).groupBy(exams.id).orderBy(desc(count(examAttempts.id))).limit(8);
  const popular = await db.select({ title: resources.title, d: resources.downloads }).from(resources).orderBy(desc(resources.downloads)).limit(6);
  const surv = await db.select({ title: surveys.title, n: count(surveyResponses.id) }).from(surveys).leftJoin(surveyResponses, eq(surveyResponses.surveyId, surveys.id)).groupBy(surveys.id).orderBy(desc(count(surveyResponses.id))).limit(6);
  const admins = await db.select({ name: auditLogs.userName, n: count() }).from(auditLogs).where(sql`${auditLogs.createdAt} > now() - interval '30 days' and ${auditLogs.userId} is not null`).groupBy(auditLogs.userName).orderBy(desc(count())).limit(6);
  const c = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const usage = [
    { label: "آزمون", value: await c(db.select({ n: count() }).from(examAttempts)) },
    { label: "یادداشت", value: await c(db.select({ n: count() }).from(notes)) },
    { label: "نکته‌نامه", value: await c(db.select({ n: count() }).from(notebooks)) },
    { label: "تکلیف", value: await c(db.select({ n: count() }).from(assignmentDone)) },
    { label: "مسابقه", value: await c(db.select({ n: count() }).from(contestEntries)) },
  ];
  const Table = ({ rows }: { rows: [string, string][] }) => rows.length === 0 ? <Empty title="داده‌ای ثبت نشده" /> : <div className="glass-solid tbl-wrap"><table className="tbl"><tbody>{rows.map(([a, b], i) => <tr key={i}><td className="font-semibold">{a}</td><td>{b}</td></tr>)}</tbody></table></div>;
  return (
    <>
      <PageHeader title="گزارش‌ها" subtitle="همه اعداد از پایگاه داده خوانده می‌شوند. بازدید صفحه‌ها اندازه‌گیری نمی‌شود و گزارش نشده است." actions={me.isOwner ? <a className="btn" href="/api/admin/backup"><Download size={17} />پشتیبان JSON</a> : undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section><SectionTitle>استفاده از قابلیت‌ها (تعداد رکورد)</SectionTitle><div className="glass p-5"><BarChart data={usage} /></div></section>
        <section><SectionTitle>کاربران به تفکیک نقش</SectionTitle><div className="grid grid-cols-3 gap-3">{byRole.map((r) => <StatCard key={r.name} label={r.name} value={r.n} />)}</div></section>
        <section><SectionTitle>مشارکت و میانگین آزمون‌ها</SectionTitle><Table rows={exam.map((e) => [e.title, `${fa(e.n)} شرکت · میانگین ${e.avg === null ? "—" : `${fa(Math.round(Number(e.avg)))}٪`}`])} /></section>
        <section><SectionTitle>محبوب‌ترین منابع (دانلود ثبت‌شده)</SectionTitle><Table rows={popular.filter((p) => p.d > 0).map((p) => [p.title, `${fa(p.d)} دانلود`])} /></section>
        <section><SectionTitle>نظرسنجی‌ها</SectionTitle><Table rows={surv.map((s) => [s.title, `${fa(s.n)} پاسخ`])} /></section>
        <section><SectionTitle>فعالیت مدیران (۳۰ روز)</SectionTitle><Table rows={admins.map((a) => [a.name ?? "—", `${fa(a.n)} رویداد`])} /></section>
      </div>
    </>
  );
}
