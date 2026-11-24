import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { BookOpen, ClipboardList, FileText, GraduationCap, Library, ScrollText, Users } from "lucide-react";
import { db } from "@/db";
import { assignments, auditLogs, examAttempts, exams, notebooks, resources, surveys, users } from "@/db/schema";
import { hasPerm, requireAdminPage } from "@/lib/auth";
import { getServices, SERVICE_STATE_LABEL } from "@/lib/services";
import { fa, formatJalali, toJalali } from "@/lib/jalali";
import { BarChart, Empty, PageHeader, SectionTitle, StatCard } from "@/components/ui";

export const metadata = { title: "داشبورد مدیریت" };

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireAdminPage();
  const sp = await searchParams;
  const c = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [uN, rN, eN, sN, aN, nN, pending] = await Promise.all([
    c(db.select({ n: count() }).from(users)),
    c(db.select({ n: count() }).from(resources)),
    c(db.select({ n: count() }).from(exams).where(eq(exams.status, "published"))),
    c(db.select({ n: count() }).from(surveys).where(eq(surveys.status, "published"))),
    c(db.select({ n: count() }).from(assignments).where(eq(assignments.status, "active"))),
    c(db.select({ n: count() }).from(notebooks)),
    c(db.select({ n: count() }).from(notebooks).where(eq(notebooks.status, "pending"))),
  ]);
  const logs = hasPerm(user, "audit") ? await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(7) : [];
  const failed = hasPerm(user, "audit") ? await c(db.select({ n: count() }).from(auditLogs).where(sql`${auditLogs.result} <> 'ok' and ${auditLogs.createdAt} > now() - interval '7 days'`)) : 0;
  const services = hasPerm(user, "settings") || hasPerm(user, "ai") ? await getServices() : [];

  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400_000));
  const attemptRows = await db.select({ d: examAttempts.startedAt }).from(examAttempts).where(sql`${examAttempts.startedAt} > now() - interval '8 days'`);
  const chart = days.map((d) => {
    const j = toJalali(d);
    const value = attemptRows.filter((r) => { const x = toJalali(r.d); return x.jy === j.jy && x.jm === j.jm && x.jd === j.jd; }).length;
    return { label: fa(j.jd), value };
  });

  return (
    <>
      <PageHeader title="داشبورد مدیریت" subtitle="آمار زنده از پایگاه داده — بدون داده ساختگی" />
      {sp.denied && <div className="badge badge-danger mb-4 !rounded-xl !px-3 !py-2">به آن بخش دسترسی ندارید.</div>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="کاربران" value={uN} icon={<Users size={20} />} />
        <StatCard label="منابع کتابخانه" value={rN} icon={<Library size={20} />} tone="teal" />
        <StatCard label="آزمون‌های فعال" value={eN} icon={<GraduationCap size={20} />} />
        <StatCard label="نظرسنجی‌های فعال" value={sN} icon={<ScrollText size={20} />} tone="warn" />
        <StatCard label="تکالیف فعال" value={aN} icon={<ClipboardList size={20} />} tone="ok" />
        <StatCard label="نکته‌نامه‌ها" value={nN} hint={pending ? `${fa(pending)} مورد در انتظار تأیید` : undefined} icon={<FileText size={20} />} tone="teal" />
        <StatCard label="رویدادهای ناموفق/ردشده (۷ روز)" value={failed} icon={<BookOpen size={20} />} tone="warn" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="glass card-hover p-5">
          <SectionTitle>شروع آزمون در ۷ روز گذشته</SectionTitle>
          {chart.every((d) => d.value === 0) ? <Empty title="داده‌ای ثبت نشده" text="هنوز آزمونی شروع نشده است." /> : <BarChart data={chart} />}
        </section>
        {services.length > 0 && (
          <section className="glass card-hover p-5">
            <SectionTitle right={<Link href="/admin/features" className="text-sm font-bold text-brand">مرکز قابلیت‌ها</Link>}>وضعیت سرویس‌ها</SectionTitle>
            <ul className="m-0 grid list-none gap-3 p-0">
              {services.map((s) => (
                <li key={s.key} className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold">{s.label}</div><div className="text-xs text-muted">{s.detail}</div></div><span className={`${SERVICE_STATE_LABEL[s.state].cls} flex-none`}>{SERVICE_STATE_LABEL[s.state].label}</span></li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {logs.length > 0 && (
        <section className="mt-8">
          <SectionTitle right={<Link href="/admin/audit" className="text-sm font-bold text-brand">همه رویدادها</Link>}>فعالیت‌های اخیر</SectionTitle>
          <div className="glass-solid tbl-wrap"><table className="tbl"><tbody>
            {logs.map((l) => (<tr key={l.id}><td className="font-semibold">{l.userName ?? "سیستم"}</td><td className="ltr text-end">{l.action}</td><td><span className={l.result === "ok" ? "badge badge-ok" : "badge badge-danger"}>{l.result === "ok" ? "موفق" : l.result === "denied" ? "ردشده" : "ناموفق"}</span></td><td className="text-xs text-muted">{formatJalali(l.createdAt, true)}</td></tr>))}
          </tbody></table></div>
        </section>
      )}
    </>
  );
}
