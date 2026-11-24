import Link from "next/link";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { Zap } from "lucide-react";
import { db } from "@/db";
import { subjects, tips } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "نکته‌های درسی" };

export default async function Tips({ searchParams }: { searchParams: Promise<{ subject?: string; q?: string }> }) {
  await requireUser();
  await gate("tips");
  const sp = await searchParams;
  const subs = await db.select().from(subjects).where(eq(subjects.active, true)).orderBy(asc(subjects.sortOrder));
  const conds = [eq(tips.status, "published")];
  if (sp.subject && Number(sp.subject)) conds.push(eq(tips.subjectId, Number(sp.subject)));
  if (sp.q?.trim()) conds.push(or(ilike(tips.title, `%${sp.q.trim()}%`), ilike(tips.body, `%${sp.q.trim()}%`), ilike(tips.topic, `%${sp.q.trim()}%`))!);
  const rows = await db.select({ t: tips, sub: subjects.name }).from(tips).leftJoin(subjects, eq(subjects.id, tips.subjectId)).where(and(...conds)).orderBy(desc(tips.createdAt)).limit(100);
  return (
    <>
      <PageHeader title="نکته‌های درسی" subtitle="محتوای کوتاه موضوعی؛ فرمول، واژگان، قواعد و جدول‌ها" />
      <form className="glass mb-4 flex gap-2 p-3" role="search">
        <input name="q" defaultValue={sp.q} className="input" placeholder="جست‌وجوی نکته…" aria-label="جست‌وجو" />
        {sp.subject && <input type="hidden" name="subject" value={sp.subject} />}
        <button className="btn btn-primary">جست‌وجو</button>
      </form>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/tips" className="chip" aria-pressed={!sp.subject}>همه درس‌ها</Link>
        {subs.map((s) => <Link key={s.id} href={`/tips?subject=${s.id}`} className="chip" aria-pressed={sp.subject === String(s.id)}>{s.name}</Link>)}
      </div>
      {rows.length === 0 ? <Empty title="نکته‌ای ثبت نشده" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(({ t, sub }) => (
            <article key={t.id} className="glass-solid fade-up p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2"><Zap size={18} className="text-brand" /><h3 className="m-0 font-extrabold">{t.title}</h3></div>
              <div className="mb-3 flex flex-wrap gap-1.5">{sub && <span className="badge badge-info">{sub}</span>}{t.chapter && <span className="badge">{t.chapter}</span>}{t.topic && <span className="badge">{t.topic}</span>}</div>
              <p className="m-0 whitespace-pre-line text-[15px] leading-8">{t.body}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
