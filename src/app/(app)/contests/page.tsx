import { and, asc, desc, eq } from "drizzle-orm";
import { CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { contestEntries, contests, programs } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { fa, formatJalali } from "@/lib/jalali";
import { ContestJoin } from "@/components/ContestJoin";
import { Empty, PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "مسابقات و برنامه‌ها" };

export default async function ContestsPage() {
  const user = await requireUser();
  await gate("contests");
  const now = new Date();
  const rows = await db.select().from(contests).where(eq(contests.status, "published")).orderBy(desc(contests.createdAt));
  const mine = new Set((await db.select({ c: contestEntries.contestId }).from(contestEntries).where(eq(contestEntries.userId, user.id))).map((r) => r.c));
  const progs = await db.select().from(programs).where(and(eq(programs.active, true))).orderBy(asc(programs.sortOrder));
  return (
    <>
      <PageHeader title="مسابقات و برنامه‌ها" />
      <SectionTitle>مسابقات</SectionTitle>
      {rows.length === 0 ? <Empty title="مسابقه‌ای ثبت نشده" /> : (
        <div className="grid gap-4 md:grid-cols-2">{rows.map((c) => {
          const open = (!c.startsAt || c.startsAt <= now) && (!c.endsAt || c.endsAt >= now);
          return (
            <article key={c.id} className="glass-solid p-5">
              <div className="flex items-start justify-between gap-2"><h3 className="m-0 font-extrabold">{c.title}</h3>{open ? <span className="badge badge-ok">باز</span> : <span className="badge">بسته</span>}</div>
              {c.description && <p className="mb-0 mt-2 whitespace-pre-line text-sm">{c.description}</p>}
              {c.rules && <details className="mt-2 text-sm"><summary className="cursor-pointer font-bold text-brand">قوانین</summary><p className="whitespace-pre-line text-muted">{c.rules}</p></details>}
              <div className="mt-2 text-xs text-muted">{c.points > 0 && <>امتیاز شرکت: {fa(c.points)} · </>}مهلت: {formatJalali(c.endsAt, true)}</div>
              {mine.has(c.id) ? <div className="badge badge-ok mt-3"><CheckCircle2 size={15} />شرکت کرده‌اید</div> : open ? <ContestJoin id={c.id} /> : null}
            </article>
          );
        })}</div>
      )}
      {progs.length > 0 && (
        <section className="mt-10"><SectionTitle>برنامه‌های ویژه و زندگی با آیه‌ها</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">{progs.map((p) => (
            <article key={p.id} className="glass overflow-hidden">{p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" loading="lazy" className="h-40 w-full object-cover" />}
              <div className="p-5"><span className="badge badge-info mb-2">{p.kind === "ayat" ? "زندگی با آیه‌ها" : "برنامه ویژه"}</span><h3 className="m-0 font-extrabold">{p.title}</h3>{p.body && <p className="mb-0 mt-2 whitespace-pre-line text-sm text-muted">{p.body}</p>}</div></article>
          ))}</div>
        </section>
      )}
    </>
  );
}
