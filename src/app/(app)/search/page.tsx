import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { Search as SearchIcon } from "lucide-react";
import { db } from "@/db";
import { announcements, assignments, events, exams, notebooks, notes, pages, programs, resources, tips } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { getDisabledFeatures } from "@/lib/settings";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "جست‌وجو" };
type Hit = { type: string; title: string; snippet?: string | null; href: string };
const TYPES: Record<string, string> = { library: "کتابخانه", notebook: "نکته‌نامه", tips: "نکته‌های درسی", notes: "یادداشت‌های من", assignments: "تکالیف", exams: "آزمون‌ها", announcements: "اطلاعیه‌ها", programs: "برنامه‌ها", events: "تقویم", pages: "صفحه‌ها" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string }> }) {
  const user = await requireUser();
  await gate("search");
  const { q: raw, type } = await searchParams;
  const q = (raw ?? "").trim().slice(0, 100);
  const off = await getDisabledFeatures();
  const hits: Hit[] = [];
  if (q.length >= 2) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const want = (t: string) => (!type || type === t) && !off.has(t === "pages" || t === "programs" ? "contests" : t === "tips" ? "tips" : t);
    const L = 8;
    if (want("library")) for (const r of await db.select().from(resources).where(and(eq(resources.status, "published"), or(ilike(resources.title, like), ilike(resources.description, like), ilike(resources.chapter, like)))).limit(L)) hits.push({ type: "library", title: r.title, snippet: r.description, href: `/library?q=${encodeURIComponent(q)}` });
    if (want("notebook")) for (const r of await db.select().from(notebooks).where(and(or(eq(notebooks.status, "published"), eq(notebooks.userId, user.id)), or(ilike(notebooks.title, like), ilike(notebooks.content, like)))).limit(L)) hits.push({ type: "notebook", title: r.title, snippet: r.content.slice(0, 120), href: `/notebook/${r.id}` });
    if (want("tips")) for (const r of await db.select().from(tips).where(and(eq(tips.status, "published"), or(ilike(tips.title, like), ilike(tips.body, like), ilike(tips.topic, like)))).limit(L)) hits.push({ type: "tips", title: r.title, snippet: r.body.slice(0, 120), href: `/tips?q=${encodeURIComponent(q)}` });
    if (want("notes")) for (const r of await db.select().from(notes).where(and(eq(notes.userId, user.id), or(ilike(notes.title, like), ilike(notes.body, like)))).limit(L)) hits.push({ type: "notes", title: r.title, snippet: r.body.slice(0, 120), href: "/notes" });
    if (want("assignments")) for (const r of await db.select().from(assignments).where(and(eq(assignments.status, "active"), or(ilike(assignments.title, like), ilike(assignments.description, like)))).limit(L)) hits.push({ type: "assignments", title: r.title, snippet: r.description, href: "/assignments" });
    if (want("exams")) for (const r of await db.select().from(exams).where(and(eq(exams.status, "published"), or(ilike(exams.title, like), ilike(exams.description, like)))).limit(L)) hits.push({ type: "exams", title: r.title, snippet: r.description, href: `/exams/${r.id}` });
    if (want("announcements")) for (const r of await db.select().from(announcements).where(and(eq(announcements.status, "published"), or(ilike(announcements.title, like), ilike(announcements.body, like)))).limit(L)) hits.push({ type: "announcements", title: r.title, snippet: r.body.slice(0, 120), href: "/announcements" });
    if (want("programs")) for (const r of await db.select().from(programs).where(and(eq(programs.active, true), or(ilike(programs.title, like), ilike(programs.body, like)))).limit(L)) hits.push({ type: "programs", title: r.title, snippet: r.body?.slice(0, 120), href: "/contests" });
    if (want("events")) for (const r of await db.select().from(events).where(or(ilike(events.title, like), ilike(events.description, like))).orderBy(desc(events.startsAt)).limit(L)) hits.push({ type: "events", title: r.title, snippet: r.description, href: "/calendar" });
    if (want("pages")) for (const r of await db.select().from(pages).where(and(eq(pages.status, "published"), ilike(pages.title, like))).limit(L)) hits.push({ type: "pages", title: r.title, href: `/p/${r.slug}` });
  }
  const counts = hits.reduce<Record<string, number>>((a, h) => ({ ...a, [h.type]: (a[h.type] ?? 0) + 1 }), {});
  return (
    <>
      <PageHeader title="جست‌وجوی سراسری" subtitle="فقط محتوایی که اجازه دیدنش را دارید نمایش داده می‌شود." />
      <form className="glass mb-4 flex gap-2 p-3" role="search"><div className="relative flex-1"><SearchIcon size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" /><input name="q" defaultValue={q} className="input !ps-10" placeholder="حداقل ۲ نویسه…" aria-label="عبارت جست‌وجو" autoFocus /></div>{type && <input type="hidden" name="type" value={type} />}<button className="btn btn-primary">جست‌وجو</button></form>
      {q.length >= 2 && <div className="mb-5 flex flex-wrap gap-2"><Link className="chip" aria-pressed={!type} href={`/search?q=${encodeURIComponent(q)}`}>همه</Link>{Object.entries(TYPES).map(([k, l]) => <Link key={k} className="chip" aria-pressed={type === k} href={`/search?q=${encodeURIComponent(q)}&type=${k}`}>{l}{counts[k] ? ` (${counts[k]})` : ""}</Link>)}</div>}
      {q.length < 2 ? <Empty title="عبارتی وارد کنید" text="در کتابخانه، نکته‌نامه، نکته‌ها، تکالیف، آزمون‌ها و… جست‌وجو می‌شود." /> : hits.length === 0 ? <Empty title="نتیجه‌ای یافت نشد" /> : (
        <div className="grid gap-3">{hits.map((h, i) => <Link key={i} href={h.href} className="glass card-hover block p-4"><div className="flex items-center gap-2"><span className="badge badge-info">{TYPES[h.type]}</span><span className="font-extrabold">{h.title}</span></div>{h.snippet && <p className="m-0 mt-1 line-clamp-2 text-sm text-muted">{h.snippet}</p>}</Link>)}</div>
      )}
    </>
  );
}
