import Link from "next/link";
import { and, asc, count, desc, eq, gte, isNull, lte, notInArray, or, sql } from "drizzle-orm";
import { Award, CalendarClock, CheckCircle2, GraduationCap, Star, Trophy } from "lucide-react";
import { db } from "@/db";
import { ads, announcements, assignmentDone, assignments, examAttempts, exams, pointEvents, subjects, userBadges } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getDisabledFeatures } from "@/lib/settings";
import { fa, formatJalali } from "@/lib/jalali";
import { BADGES } from "@/lib/points";
import { Empty, PageHeader, SectionTitle, StatCard } from "@/components/ui";

export const metadata = { title: "داشبورد" };

export default async function Dashboard() {
  const user = await requireUser();
  const off = await getDisabledFeatures();
  const now = new Date();

  const [pts] = await db.select({ s: sql<number>`coalesce(sum(${pointEvents.points}),0)::int` }).from(pointEvents).where(eq(pointEvents.userId, user.id));
  const [higher] = await db.execute<{ n: number }>(sql`select count(*)::int as n from (select user_id, sum(points) s from point_events group by user_id having sum(points) > ${pts.s}) t`).then((r) => r.rows);
  const [exCount] = await db.select({ n: count() }).from(examAttempts).where(and(eq(examAttempts.userId, user.id), sql`${examAttempts.status} in ('submitted','graded')`));
  const badges = await db.select().from(userBadges).where(eq(userBadges.userId, user.id));

  const done = db.select({ id: assignmentDone.assignmentId }).from(assignmentDone).where(eq(assignmentDone.userId, user.id));
  const todo = off.has("assignments") ? [] : await db.select({ a: assignments, sub: subjects.name }).from(assignments).leftJoin(subjects, eq(subjects.id, assignments.subjectId))
    .where(and(eq(assignments.status, "active"), notInArray(assignments.id, sql`(${done})`), or(isNull(assignments.dueDate), gte(assignments.dueDate, now)))).orderBy(asc(assignments.dueDate)).limit(4);
  const openExams = off.has("exams") ? [] : await db.select().from(exams).where(and(eq(exams.status, "published"), or(isNull(exams.startsAt), lte(exams.startsAt, now)), or(isNull(exams.endsAt), gte(exams.endsAt, now)))).orderBy(desc(exams.createdAt)).limit(3);
  const news = off.has("announcements") ? [] : await db.select().from(announcements).where(eq(announcements.status, "published")).orderBy(desc(announcements.pinned), desc(announcements.createdAt)).limit(3);
  const adRows = off.has("ads") ? [] : await db.select().from(ads).where(and(eq(ads.active, true), eq(ads.placement, "dashboard"), or(isNull(ads.startsAt), lte(ads.startsAt, now)), or(isNull(ads.endsAt), gte(ads.endsAt, now)))).limit(1);

  return (
    <>
      <PageHeader title={`سلام ${user.name.split(" ")[0]} 👋`} subtitle="خلاصه‌ی پیشرفت و کارهای امروز تو" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="امتیاز کل" value={pts.s} icon={<Star size={20} />} tone="warn" />
        <StatCard label="رتبه" value={pts.s > 0 ? `${fa(Number(higher?.n ?? 0) + 1)}` : "—"} hint={pts.s > 0 ? "بین همه دانش‌آموزان" : "هنوز امتیازی ثبت نشده"} icon={<Trophy size={20} />} />
        <StatCard label="آزمون‌های انجام‌شده" value={exCount.n} icon={<GraduationCap size={20} />} tone="teal" />
        <StatCard label="نشان‌ها" value={badges.length} icon={<Award size={20} />} tone="ok" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <SectionTitle right={<Link href="/assignments" className="text-sm font-bold text-brand">همه تکالیف</Link>}>تکالیف پیش‌رو</SectionTitle>
          {todo.length === 0 ? <Empty title="تکلیف باز نداری" text="وقتی تکلیف جدیدی ثبت شود اینجا می‌بینی." /> : (
            <div className="grid gap-3">{todo.map(({ a, sub }) => (
              <Link key={a.id} href="/assignments" className="glass card-hover flex items-center gap-4 p-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--warn-bg)] text-warn"><CalendarClock size={21} /></span>
                <div className="min-w-0 flex-1"><div className="truncate font-extrabold">{a.title}</div><div className="text-xs text-muted">{sub ?? "عمومی"} · مهلت {formatJalali(a.dueDate, true)}</div></div>
              </Link>
            ))}</div>
          )}

          <div className="mt-8"><SectionTitle right={<Link href="/exams" className="text-sm font-bold text-brand">همه آزمون‌ها</Link>}>آزمون‌های فعال</SectionTitle>
            {openExams.length === 0 ? <Empty title="آزمون فعالی نیست" /> : (
              <div className="grid gap-3 sm:grid-cols-2">{openExams.map((e) => (
                <Link key={e.id} href={`/exams/${e.id}`} className="glass card-hover block p-5"><h3 className="m-0 font-extrabold">{e.title}</h3><div className="mt-2 text-xs text-muted">{fa(e.durationMin)} دقیقه · {fa((e.questions as unknown[]).length)} سؤال</div></Link>
              ))}</div>
            )}
          </div>
        </section>

        <aside className="grid content-start gap-6">
          <section>
            <SectionTitle>نشان‌های من</SectionTitle>
            {badges.length === 0 ? <Empty title="هنوز نشانی نگرفته‌ای" text="با شرکت در آزمون و فعالیت‌ها نشان می‌گیری." /> : (
              <div className="glass grid gap-2 p-4">{badges.map((b) => { const d = BADGES.find((x) => x.key === b.badgeKey); return <div key={b.badgeKey} className="flex items-center gap-3"><CheckCircle2 size={18} className="text-ok" /><div><div className="text-sm font-bold">{d?.name ?? b.badgeKey}</div><div className="text-xs text-muted">{d?.description}</div></div></div>; })}</div>
            )}
          </section>
          {news.length > 0 && (
            <section><SectionTitle>اطلاعیه‌ها</SectionTitle>
              <div className="grid gap-3">{news.map((n) => <Link key={n.id} href="/announcements" className="glass card-hover block p-4"><div className="font-extrabold">{n.title}</div><p className="m-0 line-clamp-2 text-sm text-muted">{n.body}</p></Link>)}</div>
            </section>
          )}
          {adRows.map((a) => (
            <a key={a.id} href={a.linkUrl ? `/api/ads/${a.id}/click` : undefined} target="_blank" rel="noopener sponsored" className="glass block p-4"><span className="badge badge-warn mb-1">تبلیغ</span><div className="font-extrabold">{a.title}</div><p className="m-0 text-sm text-muted">{a.description}</p></a>
          ))}
        </aside>
      </div>
    </>
  );
}
