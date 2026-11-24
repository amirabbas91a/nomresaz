import Link from "next/link";
import { sql } from "drizzle-orm";
import { Award, Crown } from "lucide-react";
import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { BADGES } from "@/lib/points";
import { fa } from "@/lib/jalali";
import { Empty, PageHeader, SectionTitle } from "@/components/ui";

export const metadata = { title: "رتبه‌بندی و نشان‌ها" };
const PERIODS = [["week", "هفته"], ["month", "ماه"], ["all", "همه‌ی زمان‌ها"]] as const;
const KINDS = [["all", "همه"], ["exam", "آزمون"], ["contest", "مسابقه"], ["manual", "فعالیت آموزشی"]] as const;

function shortName(n: string) {
  const p = n.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1].slice(0, 1)}.` : p[0];
}

export default async function Leaderboard({ searchParams }: { searchParams: Promise<{ period?: string; kind?: string }> }) {
  const user = await requireUser();
  await gate("leaderboard");
  const sp = await searchParams;
  const period = PERIODS.some((p) => p[0] === sp.period) ? sp.period! : "month";
  const kind = KINDS.some((k) => k[0] === sp.kind) ? sp.kind! : "all";
  const since = period === "week" ? sql`now() - interval '7 days'` : period === "month" ? sql`now() - interval '30 days'` : sql`'-infinity'::timestamptz`;
  const kindCond = kind === "all" ? sql`true` : sql`p.kind = ${kind}`;
  const res = await db.execute<{ id: string; name: string; total: number; visible: boolean }>(sql`
    select u.id, u.name, u.leaderboard_visible as visible, sum(p.points)::int as total
    from point_events p join users u on u.id = p.user_id
    where p.created_at >= ${since} and ${kindCond}
    group by u.id, u.name, u.leaderboard_visible
    order by total desc, u.name asc limit 100`);
  const all = res.rows;
  const visible = all.filter((r) => r.visible).slice(0, 20);
  const myIdx = all.findIndex((r) => r.id === user.id);
  const myBadges = await db.execute<{ badge_key: string }>(sql`select badge_key from user_badges where user_id = ${user.id}`);
  const have = new Set(myBadges.rows.map((r) => r.badge_key));
  const link = (o: Record<string, string>) => `/leaderboard?${new URLSearchParams({ period, kind, ...o })}`;
  return (
    <>
      <PageHeader title="رتبه‌بندی و نشان‌ها" subtitle="فقط نام کوتاه نمایش داده می‌شود؛ می‌توانی از حساب کاربری خودت را پنهان کنی." />
      <div className="mb-3 flex flex-wrap gap-2">{PERIODS.map(([k, l]) => <Link key={k} href={link({ period: k })} className="chip" aria-pressed={period === k}>{l}</Link>)}</div>
      <div className="mb-6 flex flex-wrap gap-2">{KINDS.map(([k, l]) => <Link key={k} href={link({ kind: k })} className="chip" aria-pressed={kind === k}>{l}</Link>)}</div>
      {myIdx >= 0 && <div className="glass mb-5 flex items-center justify-between p-4"><span className="font-bold">رتبه و امتیاز تو</span><span className="badge badge-info !text-sm">رتبه {fa(myIdx + 1)} · {fa(all[myIdx].total)} امتیاز</span></div>}
      {visible.length === 0 ? <Empty title="هنوز امتیازی ثبت نشده" text="با شرکت در آزمون‌ها و مسابقه‌ها امتیاز بگیر." /> : (
        <div className="glass-solid overflow-hidden">
          {visible.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 border-b border-[var(--glass-border)] px-4 py-3 last:border-0 ${r.id === user.id ? "bg-[var(--brand-soft)]" : ""}`}>
              <span className={`grid h-9 w-9 place-items-center rounded-xl font-extrabold ${i === 0 ? "bg-[var(--warn-bg)] text-warn" : "bg-[var(--glass-bg-2)]"}`}>{i === 0 ? <Crown size={18} /> : fa(i + 1)}</span>
              <span className="flex-1 font-bold">{shortName(r.name)}</span><span className="font-extrabold">{fa(r.total)}</span><span className="text-xs text-muted">امتیاز</span>
            </div>
          ))}
        </div>
      )}
      <section className="mt-10"><SectionTitle>نشان‌ها</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{BADGES.map((b) => (
          <div key={b.key} className={`glass p-4 ${have.has(b.key) ? "" : "opacity-60"}`}><div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${have.has(b.key) ? "bg-[var(--ok-bg)] text-ok" : "bg-[var(--glass-bg-2)] text-faint"}`}><Award size={22} /></span><div><div className="font-bold">{b.name}</div><div className="text-xs text-muted">{b.description}</div></div></div><div className="mt-2">{have.has(b.key) ? <span className="badge badge-ok">دریافت شده</span> : <span className="badge">قفل</span>}</div></div>
        ))}</div>
      </section>
    </>
  );
}
