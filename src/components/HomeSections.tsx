import Link from "next/link";
import type { ReactNode } from "react";
import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { ArrowLeft, BookOpen, CalendarDays, ExternalLink, Pin, Send } from "lucide-react";
import { db } from "@/db";
import { ads, announcements, assignments, contests, events, exams, programs, resources, subjects, surveys } from "@/db/schema";
import type { SessionUser } from "@/lib/auth";
import { getHomeSections, getSetting } from "@/lib/settings";
import { formatJalali } from "@/lib/jalali";
import { SectionTitle } from "./ui";

function Card({ title, more, children }: { title: string; more?: string; children: ReactNode }) {
  return (
    <section className="fade-up">
      <SectionTitle right={more ? <Link href={more} className="inline-flex items-center gap-1 text-sm font-bold text-brand">مشاهده همه<ArrowLeft size={15} /></Link> : undefined}>{title}</SectionTitle>
      {children}
    </section>
  );
}

const windowOk = (s: typeof exams.startsAt, e: typeof exams.endsAt, now: Date) => and(or(isNull(s), lte(s, now)), or(isNull(e), gte(e, now)));

export async function HomeSections({ user, off }: { user: SessionUser | null; off: Set<string> }) {
  const sections = (await getHomeSections()).filter((s) => s.visible);
  const now = new Date();
  const baleUrl = await getSetting("bale_url", "https://ble.ir/moaalem2");
  const out: ReactNode[] = [];

  for (const s of sections) {
    let node: ReactNode = null;
    switch (s.key) {
      case "programs": {
        if (off.has("contests")) break;
        const rows = await db.select().from(programs).where(and(eq(programs.kind, "special"), eq(programs.active, true))).orderBy(asc(programs.sortOrder)).limit(3);
        if (!rows.length) break;
        node = (
          <div className="grid gap-4 md:grid-cols-3">
            {rows.map((p) => (
              <article key={p.id} className="glass card-hover overflow-hidden">
                {p.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.imageUrl} alt="" loading="lazy" className="h-36 w-full object-cover" />}
                <div className="p-5"><h3 className="m-0 font-extrabold">{p.title}</h3>{p.body && <p className="mb-0 mt-1 line-clamp-3 text-sm text-muted">{p.body}</p>}</div>
              </article>
            ))}
          </div>
        );
        break;
      }
      case "announcements": {
        if (off.has("announcements")) break;
        const rows = await db.select().from(announcements).where(eq(announcements.status, "published")).orderBy(desc(announcements.pinned), desc(announcements.createdAt)).limit(4);
        if (!rows.length) break;
        node = (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((a) => (
              <Link key={a.id} href="/announcements" className="glass card-hover block p-5">
                <div className="mb-1 flex items-center gap-2">{a.pinned && <Pin size={15} className="text-warn" />}<h3 className="m-0 font-extrabold">{a.title}</h3></div>
                <p className="m-0 line-clamp-2 text-sm text-muted">{a.body}</p>
                <div className="mt-2 text-xs text-faint">{formatJalali(a.createdAt)}</div>
              </Link>
            ))}
          </div>
        );
        s.title = s.title || "اطلاعیه‌ها";
        node = <Card title={s.title} more="/announcements">{node}</Card>;
        out.push(<div key={s.key}>{node}</div>);
        continue;
      }
      case "assignments": {
        if (!user || off.has("assignments")) break;
        const rows = await db.select({ a: assignments, sub: subjects.name }).from(assignments).leftJoin(subjects, eq(subjects.id, assignments.subjectId)).where(and(eq(assignments.status, "active"), or(isNull(assignments.dueDate), gte(assignments.dueDate, now)))).orderBy(asc(assignments.dueDate)).limit(4);
        if (!rows.length) break;
        node = (
          <div className="grid gap-3 md:grid-cols-2">{rows.map(({ a, sub }) => (
            <Link key={a.id} href="/assignments" className="glass card-hover block p-5">
              <div className="flex items-center justify-between gap-2"><h3 className="m-0 font-extrabold">{a.title}</h3>{sub && <span className="badge badge-info">{sub}</span>}</div>
              <div className="mt-2 text-xs text-muted">مهلت: {formatJalali(a.dueDate, true)}</div>
            </Link>
          ))}</div>
        );
        out.push(<div key={s.key}><Card title={s.title} more="/assignments">{node}</Card></div>);
        continue;
      }
      case "exams": {
        if (!user || off.has("exams")) break;
        const rows = await db.select().from(exams).where(and(eq(exams.status, "published"), windowOk(exams.startsAt, exams.endsAt, now))).orderBy(desc(exams.createdAt)).limit(4);
        if (!rows.length) break;
        node = <div className="grid gap-3 md:grid-cols-2">{rows.map((e) => (
          <Link key={e.id} href={`/exams/${e.id}`} className="glass card-hover block p-5"><h3 className="m-0 font-extrabold">{e.title}</h3><div className="mt-2 text-xs text-muted">{e.durationMin} دقیقه · {(e.questions as unknown[]).length} سؤال</div></Link>
        ))}</div>;
        out.push(<div key={s.key}><Card title={s.title} more="/exams">{node}</Card></div>);
        continue;
      }
      case "surveys": {
        if (!user || off.has("surveys")) break;
        const rows = await db.select().from(surveys).where(and(eq(surveys.status, "published"), windowOk(surveys.startsAt as never, surveys.endsAt as never, now))).orderBy(desc(surveys.createdAt)).limit(3);
        if (!rows.length) break;
        node = <div className="grid gap-3 md:grid-cols-3">{rows.map((e) => (
          <Link key={e.id} href={`/surveys/${e.id}`} className="glass card-hover block p-5"><h3 className="m-0 font-extrabold">{e.title}</h3>{e.anonymous && <span className="badge mt-2">ناشناس</span>}</Link>
        ))}</div>;
        out.push(<div key={s.key}><Card title={s.title} more="/surveys">{node}</Card></div>);
        continue;
      }
      case "resources": {
        if (!user || off.has("library")) break;
        const rows = await db.select({ r: resources, sub: subjects.name }).from(resources).leftJoin(subjects, eq(subjects.id, resources.subjectId)).where(eq(resources.status, "published")).orderBy(desc(resources.createdAt)).limit(4);
        if (!rows.length) break;
        node = <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{rows.map(({ r, sub }) => (
          <Link key={r.id} href="/library" className="glass card-hover block p-5"><BookOpen size={20} className="text-brand" /><h3 className="m-0 mt-2 text-sm font-extrabold">{r.title}</h3><div className="mt-1 text-xs text-muted">{sub ?? "عمومی"}</div></Link>
        ))}</div>;
        out.push(<div key={s.key}><Card title={s.title} more="/library">{node}</Card></div>);
        continue;
      }
      case "events": {
        if (off.has("calendar")) break;
        const rows = await db.select().from(events).where(gte(events.startsAt, now)).orderBy(asc(events.startsAt)).limit(4);
        if (!rows.length) break;
        node = <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{rows.map((e) => (
          <div key={e.id} className="glass p-5" style={{ borderInlineStart: `4px solid ${e.color ?? "var(--brand)"}` }}><CalendarDays size={18} className="text-brand" /><h3 className="m-0 mt-1 text-sm font-extrabold">{e.title}</h3><div className="mt-1 text-xs text-muted">{formatJalali(e.startsAt, true)}</div></div>
        ))}</div>;
        out.push(<div key={s.key}><Card title={s.title} more="/calendar">{node}</Card></div>);
        continue;
      }
      case "contests": {
        if (off.has("contests")) break;
        const rows = await db.select().from(contests).where(and(eq(contests.status, "published"), or(isNull(contests.endsAt), gte(contests.endsAt, now)))).orderBy(desc(contests.createdAt)).limit(3);
        if (!rows.length) break;
        node = <div className="grid gap-3 md:grid-cols-3">{rows.map((c) => (
          <Link key={c.id} href="/contests" className="glass card-hover block p-5"><h3 className="m-0 font-extrabold">{c.title}</h3><p className="mb-0 mt-1 line-clamp-2 text-sm text-muted">{c.description}</p></Link>
        ))}</div>;
        out.push(<div key={s.key}><Card title={s.title} more="/contests">{node}</Card></div>);
        continue;
      }
      case "ads": {
        if (off.has("ads")) break;
        const rows = await db.select().from(ads).where(and(eq(ads.active, true), eq(ads.placement, "home"), or(isNull(ads.startsAt), lte(ads.startsAt, now)), or(isNull(ads.endsAt), gte(ads.endsAt, now)))).orderBy(sql`random()`).limit(2);
        if (!rows.length) break;
        node = <div className="grid gap-3 md:grid-cols-2">{rows.map((a) => (
          <a key={a.id} href={a.linkUrl ? `/api/ads/${a.id}/click` : undefined} target="_blank" rel="noopener sponsored" className="glass card-hover flex items-center gap-4 overflow-hidden p-4">
            {a.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.imageUrl} alt="" loading="lazy" className="h-20 w-20 flex-none rounded-2xl object-cover" />}
            <div className="min-w-0"><span className="badge badge-warn mb-1">تبلیغ</span><h3 className="m-0 truncate font-extrabold">{a.title}</h3>{a.description && <p className="m-0 line-clamp-2 text-sm text-muted">{a.description}</p>}</div>
            {a.linkUrl && <ExternalLink size={16} className="ms-auto flex-none text-faint" />}
          </a>
        ))}</div>;
        out.push(<div key={s.key}><Card title={s.title}>{node}</Card></div>);
        continue;
      }
      case "ayat": {
        if (off.has("contests")) break;
        const [p] = await db.select().from(programs).where(and(eq(programs.kind, "ayat"), eq(programs.active, true))).orderBy(asc(programs.sortOrder)).limit(1);
        if (!p) break;
        node = (
          <div className="glass relative overflow-hidden p-8 text-center">
            <div className="pointer-events-none absolute -top-10 start-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-[var(--teal)] opacity-20 blur-3xl" />
            <h3 className="relative m-0 text-xl font-extrabold">{p.title}</h3>
            {p.body && <p className="relative mx-auto mb-0 mt-3 max-w-2xl whitespace-pre-line text-lg leading-loose">{p.body}</p>}
          </div>
        );
        out.push(<div key={s.key}><Card title={s.title}>{node}</Card></div>);
        continue;
      }
      case "bale": {
        node = (
          <a href={baleUrl} target="_blank" rel="noopener noreferrer" className="glass card-hover flex flex-wrap items-center justify-between gap-3 p-5">
            <div><h3 className="m-0 font-extrabold">کانال نمره‌ساز در بله</h3><p className="m-0 text-sm text-muted">اطلاعیه‌ها و نکته‌نامه‌ها را در کانال @moaalem2 دنبال کنید.</p></div>
            <span className="btn btn-primary"><Send size={17} />عضویت در کانال</span>
          </a>
        );
        out.push(<div key={s.key}><Card title={s.title}>{node}</Card></div>);
        continue;
      }
    }
    if (node) out.push(<div key={s.key}><Card title={s.title}>{node}</Card></div>);
  }
  return <div className="grid gap-10">{out}</div>;
}
