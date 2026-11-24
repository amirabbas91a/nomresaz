import Link from "next/link";
import { ArrowLeft, Bot, ClipboardCheck, GraduationCap, Library, Search, Sparkles, Trophy, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getDisabledFeatures, getSite } from "@/lib/settings";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HomeSections } from "@/components/HomeSections";
import { Reveal, CountUp } from "@/components/Reveal";

export const dynamic = "force-dynamic";

const QUICK = [
  { href: "/library", label: "کتابخانه", icon: Library, f: "library" },
  { href: "/exams", label: "آزمون آنلاین", icon: GraduationCap, f: "exams" },
  { href: "/assignments", label: "تکالیف", icon: ClipboardCheck, f: "assignments" },
  { href: "/leaderboard", label: "رتبه‌بندی", icon: Trophy, f: "leaderboard" },
  { href: "/tips", label: "نکته‌های درسی", icon: Sparkles, f: "tips" },
];

export default async function HomePage() {
  const [user, site, off] = await Promise.all([getCurrentUser(), getSite(), getDisabledFeatures()]);
  return (
    <>
      <header className="topbar-wrap sticky top-0 z-30">
        <div className="glass-float topbar mx-auto flex max-w-[1180px] items-center justify-between">
          <Link href="/" aria-label={site.siteName} className="topbar-logo flex items-center">
            <Logo name={site.siteName} />
          </Link>
          <nav className="flex items-center" aria-label="ناوبری اصلی">
            {!off.has("search") && (
              <>
                <span className="topbar-search-icon">
                  <Link href="/search" className="btn btn-ghost btn-icon" aria-label="جست‌وجو"><Search size={18} /></Link>
                </span>
                <span className="topbar-search-text">
                  <Link href="/search" className="btn btn-ghost btn-sm">جست‌وجو</Link>
                </span>
              </>
            )}
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard" className="btn btn-primary btn-sm">داشبورد</Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">ورود</Link>
                <Link href="/register" className="btn btn-primary btn-sm">ثبت‌نام</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-4 pb-16">
        <section className="relative grid items-center gap-10 py-14 md:grid-cols-[1.15fr_1fr] md:py-20">
          <Reveal>
            <span className="badge badge-info hero-badge mb-4"><Sparkles size={14} /><span className="pulse-dot">{site.tagline}</span></span>
            <h1 className="hero-title m-0 text-4xl font-extrabold leading-[1.35] md:text-[3.4rem]">{site.heroTitle}</h1>
            <p className="mb-7 mt-4 max-w-xl text-lg text-muted">{site.heroText}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={user ? "/dashboard" : "/register"} className="btn btn-primary !min-h-[50px] !px-7 !text-base">{user ? "ورود به داشبورد" : "شروع رایگان"}<ArrowLeft size={18} /></Link>
              {!off.has("library") && <Link href={user ? "/library" : "/login"} className="btn !min-h-[50px] !px-7 !text-base">مشاهده منابع</Link>}
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="relative mx-auto w-full max-w-md">
              <div className="hero-glow" aria-hidden />
              <div className="glass relative p-5">
                <div className="mb-4 flex items-center justify-between"><span className="font-extrabold">آزمون مرور فصل</span><span className="badge badge-ok">در حال برگزاری</span></div>
                <div className="grid gap-2.5">
                  {["گزینه‌ی نخست", "گزینه‌ی دوم (انتخاب‌شده)", "گزینه‌ی سوم"].map((t, i) => (
                    <div key={t} className="choice hover-lift" aria-checked={i === 1} role="presentation"><span className="mark">✓</span><span className="text-sm font-semibold">{t}</span></div>
                  ))}
                </div>
                <div className="demo-progress mt-4 h-2 bg-[var(--glass-bg-2)]"><i style={{ width: "66%" }} /></div>
                <p className="m-0 mt-2 text-xs text-faint">نمونه‌ی نمایشی از محیط آزمون</p>
              </div>
              <div className="glass-float hero-float absolute -bottom-5 -start-4 z-20 flex items-center gap-2 px-4 py-2.5"><Bot size={18} className="text-brand" /><span className="text-sm font-bold">دستیار هوشمند مدیریت</span></div>
              <div className="glass-float hero-float-2 absolute -top-4 -end-3 z-20 flex items-center gap-2 px-4 py-2.5"><Zap size={18} className="text-[var(--teal)]" /><span className="text-sm font-bold">تحلیل لحظه‌ای</span></div>
            </div>
          </Reveal>
        </section>

        <section className="mb-14 grid grid-cols-2 gap-3 md:grid-cols-6" aria-label="دسترسی سریع">
          {QUICK.filter((q) => !off.has(q.f)).map((q, i) => (
            <Reveal key={q.href} delay={i * 0.06}>
              <Link href={user ? q.href : "/login"} className="glass card-hover flex flex-col items-center gap-2 p-5 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--brand-soft)] text-brand"><q.icon size={23} /></span>
                <span className="text-sm font-bold">{q.label}</span>
              </Link>
            </Reveal>
          ))}
        </section>

        <Reveal>
          <section className="mb-14 grid grid-cols-3 gap-3" aria-label="آمار پلتفرم">
            {[
              { v: 1240, l: "دانش‌آموز فعال" },
              { v: 356, l: "منبع آموزشی" },
              { v: 9820, l: "آزمون برگزارشده" },
            ].map((s) => (
              <div key={s.l} className="glass card-hover relative overflow-hidden p-5 text-center">
                <span className="stat-glow" aria-hidden />
                <CountUp value={s.v} className="stat-value num block text-2xl font-extrabold md:text-3xl" />
                <span className="text-xs text-muted md:text-sm">{s.l}</span>
              </div>
            ))}
          </section>
        </Reveal>

        <HomeSections user={user} off={off} />
      </main>

      <footer className="border-t border-[var(--glass-border)] py-8">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted">
          <Logo name={site.siteName} compact />
          <span>{site.siteName} — {site.tagline}</span>
          <a href="https://ble.ir/moaalem2" target="_blank" rel="noopener noreferrer" className="font-bold text-brand">کانال بله @moaalem2</a>
        </div>
      </footer>
    </>
  );
}
