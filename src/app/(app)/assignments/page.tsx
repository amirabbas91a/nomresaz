import Link from "next/link";
import { and, asc, desc, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { Download, Paperclip } from "lucide-react";
import { db } from "@/db";
import { assignmentDone, assignments, subjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { formatJalali } from "@/lib/jalali";
import { DoneToggle } from "@/components/DoneToggle";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "تکالیف" };
const TABS = [["today", "امروز"], ["tomorrow", "فردا"], ["upcoming", "همه‌ی پیش‌رو"], ["history", "سوابق"]] as const;

function tehranDayStart(offsetDays: number) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return new Date(new Date(`${f}T00:00:00+03:30`).getTime() + offsetDays * 86400_000);
}

export default async function Assignments({ searchParams }: { searchParams: Promise<{ tab?: string; subject?: string }> }) {
  const user = await requireUser();
  await gate("assignments");
  const sp = await searchParams;
  const tab = TABS.some((t) => t[0] === sp.tab) ? sp.tab! : "upcoming";
  const conds = [];
  if (tab === "history") conds.push(or(eq(assignments.status, "archived"), lt(assignments.dueDate, tehranDayStart(0)))!);
  else {
    conds.push(eq(assignments.status, "active"));
    if (tab === "today") conds.push(and(gte(assignments.dueDate, tehranDayStart(0)), lt(assignments.dueDate, tehranDayStart(1)))!);
    else if (tab === "tomorrow") conds.push(and(gte(assignments.dueDate, tehranDayStart(1)), lt(assignments.dueDate, tehranDayStart(2)))!);
    else conds.push(or(isNull(assignments.dueDate), gte(assignments.dueDate, tehranDayStart(0)))!);
  }
  if (sp.subject && Number(sp.subject)) conds.push(eq(assignments.subjectId, Number(sp.subject)));
  const rows = await db
    .select({ a: assignments, sub: subjects.name, doneAt: assignmentDone.doneAt })
    .from(assignments)
    .leftJoin(subjects, eq(subjects.id, assignments.subjectId))
    .leftJoin(assignmentDone, and(eq(assignmentDone.assignmentId, assignments.id), eq(assignmentDone.userId, user.id)))
    .where(and(...conds))
    .orderBy(tab === "history" ? desc(assignments.dueDate) : asc(assignments.dueDate))
    .limit(100);
  const subs = await db.select().from(subjects).where(eq(subjects.active, true)).orderBy(asc(subjects.sortOrder));
  void lte;
  return (
    <>
      <PageHeader title="تکالیف" subtitle="مهلت‌ها را از دست نده؛ انجام‌شده‌ها را علامت بزن" />
      <div className="mb-4 flex flex-wrap gap-2">{TABS.map(([k, l]) => <Link key={k} href={`/assignments?tab=${k}${sp.subject ? `&subject=${sp.subject}` : ""}`} className="chip" aria-pressed={tab === k}>{l}</Link>)}</div>
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href={`/assignments?tab=${tab}`} className="chip" aria-pressed={!sp.subject}>همه درس‌ها</Link>
        {subs.map((s) => <Link key={s.id} href={`/assignments?tab=${tab}&subject=${s.id}`} className="chip" aria-pressed={sp.subject === String(s.id)}>{s.name}</Link>)}
      </div>
      {rows.length === 0 ? <Empty title="تکلیفی در این بخش نیست" /> : (
        <div className="grid gap-3">
          {rows.map(({ a, sub, doneAt }) => (
            <article key={a.id} className="glass fade-up p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="m-0 font-extrabold">{a.title}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">{sub && <span className="badge badge-info">{sub}</span>}<span>مهلت: {formatJalali(a.dueDate, true)}</span>{a.status === "archived" && <span className="badge badge-warn">بایگانی</span>}</div>
                </div>
                <DoneToggle id={a.id} done={!!doneAt} />
              </div>
              {a.description && <p className="mb-0 mt-3 whitespace-pre-line text-sm leading-7">{a.description}</p>}
              {a.fileId && <a href={`/api/files/${a.fileId}?dl=1`} className="btn btn-sm mt-3"><Paperclip size={15} />پیوست<Download size={15} /></a>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
