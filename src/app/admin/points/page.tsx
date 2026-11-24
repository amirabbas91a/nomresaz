import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pointEvents, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { fa, formatJalali } from "@/lib/jalali";
import { PointsAdjust } from "@/components/PointsAdjust";
import { Empty, PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "امتیازها" };

export default async function AdminPoints() {
  await requireAdminPage("results");
  const students = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.roleKey, "student"));
  const rows = await db.select({ p: pointEvents, name: users.name }).from(pointEvents).innerJoin(users, eq(users.id, pointEvents.userId)).orderBy(desc(pointEvents.createdAt)).limit(50);
  const KIND: Record<string, string> = { exam: "آزمون", contest: "مسابقه", manual: "اصلاح دستی" };
  return (
    <>
      <PageHeader title="امتیازها" subtitle="هر رویداد فقط یک‌بار امتیاز می‌دهد؛ اصلاح دستی همراه دلیل و نام مدیر ثبت می‌شود." />
      {students.length > 0 ? <PointsAdjust users={students} /> : <Empty title="دانش‌آموزی ثبت نشده" />}
      <section className="mt-8"><SectionTitle>آخرین رویدادهای امتیاز</SectionTitle>
        {rows.length === 0 ? <Empty title="رویدادی ثبت نشده" /> : (
          <div className="glass-solid tbl-wrap"><table className="tbl"><thead><tr><th>دانش‌آموز</th><th>نوع</th><th>امتیاز</th><th>دلیل</th><th>ثبت‌کننده</th><th>زمان</th></tr></thead><tbody>
            {rows.map(({ p, name }) => <tr key={p.id}><td className="font-bold">{name}</td><td>{KIND[p.kind] ?? p.kind}</td><td className={p.points < 0 ? "text-danger" : "text-ok"}>{fa(p.points)}</td><td>{p.reason ?? "—"}</td><td>{p.createdBy ?? "سیستم"}</td><td className="text-xs text-muted">{formatJalali(p.createdAt, true)}</td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </>
  );
}
