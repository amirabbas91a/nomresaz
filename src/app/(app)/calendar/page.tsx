import Link from "next/link";
import { and, eq, gte, lt } from "drizzle-orm";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/db";
import { assignments, events, exams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { JALALI_MONTHS, WEEKDAYS, fa, jalaliMonthLength, jalaliToDate, toJalali } from "@/lib/jalali";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "تقویم" };
type Item = { key: string; title: string; color: string; time: string; kind: string; y: number; m: number; d: number; href?: string };
const DAY = 86400_000;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ view?: string; y?: string; m?: string; d?: string }> }) {
  await requireUser();
  await gate("calendar");
  const sp = await searchParams;
  const today = toJalali(new Date());
  const view = sp.view === "week" || sp.view === "day" ? sp.view : "month";
  const y = Number(sp.y) || today.jy;
  const m = Math.min(12, Math.max(1, Number(sp.m) || today.jm));
  const d = Math.min(jalaliMonthLength(y, m), Math.max(1, Number(sp.d) || (sp.y || sp.m ? 1 : today.jd)));

  const anchor = jalaliToDate(y, m, d);
  let start: Date, end: Date;
  if (view === "month") { start = jalaliToDate(y, m, 1); end = new Date(jalaliToDate(y, m, jalaliMonthLength(y, m)).getTime() + DAY); }
  else if (view === "week") { const wd = toJalali(anchor).weekday; start = new Date(anchor.getTime() - wd * DAY); end = new Date(start.getTime() + 7 * DAY); }
  else { start = anchor; end = new Date(anchor.getTime() + DAY); }
  // widen by a day each side to be safe with timezone rounding; filtering is done on Jalali parts below
  const qs = new Date(start.getTime() - DAY), qe = new Date(end.getTime() + DAY);

  const [ev, as, ex] = await Promise.all([
    db.select().from(events).where(and(gte(events.startsAt, qs), lt(events.startsAt, qe))),
    db.select().from(assignments).where(and(eq(assignments.status, "active"), gte(assignments.dueDate, qs), lt(assignments.dueDate, qe))),
    db.select().from(exams).where(and(eq(exams.status, "published"), gte(exams.startsAt, qs), lt(exams.startsAt, qe))),
  ]);
  const hhmm = (dt: Date) => { const j = toJalali(dt); return `${fa(String(j.h).padStart(2, "0"))}:${fa(String(j.mi).padStart(2, "0"))}`; };
  const mk = (dt: Date, key: string, title: string, color: string, kind: string, href?: string): Item => { const j = toJalali(dt); return { key, title, color, kind, time: hhmm(dt), y: j.jy, m: j.jm, d: j.jd, href }; };
  const items: Item[] = [
    ...ev.map((e) => mk(e.startsAt, `e${e.id}`, e.title, e.color ?? "#2358e8", "رویداد")),
    ...as.map((a) => mk(a.dueDate!, `a${a.id}`, `مهلت: ${a.title}`, "#d97706", "تکلیف", "/assignments")),
    ...ex.map((e) => mk(e.startsAt!, `x${e.id}`, `آزمون: ${e.title}`, "#12b5a6", "آزمون", `/exams/${e.id}`)),
  ].sort((a, b) => a.time.localeCompare(b.time));
  const on = (yy: number, mm: number, dd: number) => items.filter((i) => i.y === yy && i.m === mm && i.d === dd);

  const nav = (dir: number) => {
    const t = view === "month" ? jalaliToDate(dir > 0 ? (m === 12 ? y + 1 : y) : (m === 1 ? y - 1 : y), dir > 0 ? (m === 12 ? 1 : m + 1) : (m === 1 ? 12 : m - 1), 1) : new Date(anchor.getTime() + dir * (view === "week" ? 7 : 1) * DAY);
    const j = toJalali(t);
    return `/calendar?view=${view}&y=${j.jy}&m=${j.jm}&d=${j.jd}`;
  };
  const tabHref = (v: string) => `/calendar?view=${v}&y=${y}&m=${m}&d=${d}`;

  const firstWd = toJalali(jalaliToDate(y, m, 1)).weekday;
  const cells: (number | null)[] = [...Array(firstWd).fill(null), ...Array.from({ length: jalaliMonthLength(y, m) }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const days = view === "week" ? Array.from({ length: 7 }, (_, i) => toJalali(new Date(start.getTime() + i * DAY))) : [toJalali(anchor)];

  return (
    <>
      <PageHeader title="تقویم شمسی" subtitle={`${JALALI_MONTHS[m - 1]} ${fa(y)}`} actions={
        <div className="flex flex-wrap items-center gap-2">
          {[["month", "ماه"], ["week", "هفته"], ["day", "روز"]].map(([k, l]) => <Link key={k} href={tabHref(k)} className="chip" aria-pressed={view === k}>{l}</Link>)}
          <Link href={nav(-1)} className="btn btn-icon btn-sm" aria-label="قبلی"><ChevronRight size={18} /></Link>
          <Link href="/calendar" className="btn btn-sm">امروز</Link>
          <Link href={nav(1)} className="btn btn-icon btn-sm" aria-label="بعدی"><ChevronLeft size={18} /></Link>
        </div>} />
      {view === "month" ? (
        <>
          <div className="glass-solid hidden overflow-hidden md:block">
            <div className="grid grid-cols-7 border-b border-[var(--glass-border)] text-center text-xs font-bold text-muted">{WEEKDAYS.map((w) => <div key={w} className="py-2">{w}</div>)}</div>
            <div className="grid grid-cols-7">{cells.map((c, i) => {
              const list = c ? on(y, m, c) : [];
              const isToday = c === today.jd && m === today.jm && y === today.jy;
              return (
                <div key={i} className={`min-h-[104px] border-b border-s border-[var(--glass-border)] p-1.5 ${c ? "" : "bg-[var(--glass-bg-2)]"}`}>
                  {c && <><Link href={`/calendar?view=day&y=${y}&m=${m}&d=${c}`} className={`mb-1 grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${isToday ? "bg-[var(--brand)] text-white" : ""} ${i % 7 === 6 ? "text-danger" : ""}`}>{fa(c)}</Link>
                    {list.slice(0, 3).map((it) => <div key={it.key} className="mb-0.5 truncate rounded-md px-1.5 text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${it.color} 18%, transparent)`, color: it.color, borderInlineStart: `3px solid ${it.color}` }} title={it.title}>{it.title}</div>)}
                    {list.length > 3 && <Link href={`/calendar?view=day&y=${y}&m=${m}&d=${c}`} className="text-[11px] font-bold text-brand">+{fa(list.length - 3)} مورد دیگر</Link>}</>}
                </div>
              );
            })}</div>
          </div>
          <div className="grid gap-2 md:hidden">{Array.from({ length: jalaliMonthLength(y, m) }, (_, i) => i + 1).map((c) => { const list = on(y, m, c); return (
            <Link key={c} href={`/calendar?view=day&y=${y}&m=${m}&d=${c}`} className={`glass flex items-center gap-3 p-3 ${c === today.jd && m === today.jm && y === today.jy ? "ring-2 ring-[var(--brand)]" : ""}`}>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--glass-bg-2)] font-extrabold">{fa(c)}</span><div className="min-w-0 flex-1 text-sm">{list.length === 0 ? <span className="text-faint">—</span> : list.slice(0, 2).map((it) => <div key={it.key} className="truncate" style={{ color: it.color }}>● {it.title}</div>)}</div>{list.length > 2 && <span className="badge">+{fa(list.length - 2)}</span>}</Link>); })}</div>
        </>
      ) : (
        <div className="grid gap-3">{days.map((dj) => { const list = on(dj.jy, dj.jm, dj.jd); return (
          <section key={`${dj.jm}-${dj.jd}`} className="glass-solid p-4"><h3 className="m-0 mb-2 font-extrabold">{WEEKDAYS[dj.weekday]} {fa(dj.jd)} {JALALI_MONTHS[dj.jm - 1]}</h3>
            {list.length === 0 ? <p className="m-0 text-sm text-faint">رویدادی نیست.</p> : <ul className="m-0 grid list-none gap-2 p-0">{list.map((it) => <li key={it.key} className="flex items-center gap-3 rounded-xl p-3" style={{ background: `color-mix(in srgb, ${it.color} 12%, transparent)`, borderInlineStart: `4px solid ${it.color}` }}><span className="num text-sm font-bold">{it.time}</span>{it.href ? <Link href={it.href} className="font-bold">{it.title}</Link> : <span className="font-bold">{it.title}</span>}<span className="badge ms-auto">{it.kind}</span></li>)}</ul>}
          </section>); })}</div>
      )}
    </>
  );
}
