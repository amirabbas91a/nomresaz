"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, BookOpen, Bot, CalendarDays, ChevronsRight, ClipboardList, FileText, Flag, GraduationCap, LayoutDashboard,
  Library, LogOut, Megaphone, Menu, MessageSquare, NotebookPen, Palette, Search, Shield, Sparkles, StickyNote, ToggleRight, Trophy, Users, X, Zap, ScrollText, Presentation, Settings2,
} from "lucide-react";
import { Logo, LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import type { NavGroup } from "@/lib/nav";
import { fa } from "@/lib/jalali";

const ICONS: Record<string, typeof Bell> = {
  dashboard: LayoutDashboard, library: Library, notebook: NotebookPen, tips: Zap, notes: StickyNote, assignments: ClipboardList,
  exams: GraduationCap, surveys: ScrollText, trophy: Trophy, calendar: CalendarDays, megaphone: Megaphone, flag: Flag,
  message: MessageSquare, search: Search, chart: BarChart3, bot: Bot, book: BookOpen, file: FileText, sparkles: Sparkles,
  ad: Presentation, users: Users, palette: Palette, toggle: ToggleRight, shield: Shield, settings: Settings2,
};

type Notif = { id: string; title: string; body: string; href: string; kind: string };

export function Shell({
  nav, user, siteName, children, admin = false, canAdmin = false,
}: {
  nav: NavGroup[];
  user: { name: string; roleName: string };
  siteName: string;
  children: ReactNode;
  admin?: boolean;
  canAdmin?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notifs, setNotifs] = useState<Notif[] | null>(null);
  const [q, setQ] = useState("");
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem("nm-collapsed") === "1");
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrawer(false); setBell(false); setMenu(false);
  }, [path]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) { setBell(false); setMenu(false); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = (href: string) => (href === "/admin" || href === "/dashboard" ? path === href : path === href || path.startsWith(href + "/"));
  const mobileItems = nav.flatMap((g) => g.items).filter((i) => i.mobile).slice(0, 4);

  async function openBell() {
    setBell((b) => !b); setMenu(false);
    if (!notifs) {
      const r = await fetch("/api/notifications");
      setNotifs(r.ok ? (await r.json()).items : []);
    }
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  }

  const sidebar = (mobile: boolean) => (
    <nav aria-label="منوی اصلی" className="flex h-full flex-col">
      <div className={`flex items-center ${collapsed && !mobile ? "justify-center" : "justify-between"} px-4 pb-2 pt-5`}>
        <Link href={admin ? "/admin" : "/dashboard"} aria-label={siteName}>
          {collapsed && !mobile ? <LogoMark size={36} /> : <Logo name={siteName} />}
        </Link>
        {mobile && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setDrawer(false)} aria-label="بستن منو"><X size={18} /></button>}
      </div>
      {admin && !collapsed && <div className="mx-4 mb-1 mt-1"><span className="badge badge-info">پنل مدیریت</span></div>}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {nav.map((g) => (
          <div key={g.title}>
            {!(collapsed && !mobile) && <div className="nav-group">{g.title}</div>}
            {collapsed && !mobile && <div className="my-2 h-px bg-[var(--glass-border)]" />}
            {g.items.map((it) => {
              const Icon = ICONS[it.icon] ?? FileText;
              return (
                <Link key={it.href} href={it.href} className="nav-link hover-lift" aria-current={active(it.href) ? "page" : undefined} title={it.label}>
                  <Icon size={19} className="flex-none" />
                  {!(collapsed && !mobile) && <span className="truncate">{it.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--glass-border)] p-3">
        {canAdmin && (
          <Link href={admin ? "/dashboard" : "/admin"} className="nav-link" title={admin ? "نمای دانش‌آموز" : "پنل مدیریت"}>
            {admin ? <GraduationCap size={19} /> : <Shield size={19} />}
            {!(collapsed && !mobile) && <span>{admin ? "نمای دانش‌آموز" : "پنل مدیریت"}</span>}
          </Link>
        )}
        {!mobile && (
          <button className="nav-link w-full" onClick={() => { setCollapsed(!collapsed); localStorage.setItem("nm-collapsed", collapsed ? "0" : "1"); }} aria-label="جمع‌کردن منو">
            <ChevronsRight size={19} className={`flex-none transition ${collapsed ? "rotate-180" : ""}`} />
            {!collapsed && <span>جمع‌کردن منو</span>}
          </button>
        )}
      </div>
    </nav>
  );

  return (
    <div className="min-h-dvh">
      <aside className={`glass !fixed inset-y-3 start-3 z-30 hidden transition-[width] duration-200 md:block ${collapsed ? "w-[76px]" : "w-[260px]"}`} style={{ borderRadius: 24 }}>
        {sidebar(false)}
      </aside>
      {drawer && (
        <div className="!fixed inset-0 z-[65] md:hidden" onMouseDown={(e) => e.target === e.currentTarget && setDrawer(false)} style={{ background: "rgba(5,12,36,.5)" }}>
          <div className="glass-float drawer pop-in !rounded-none" style={{ animation: "slideIn .25s ease both", transform: "none" }}>{sidebar(true)}</div>
        </div>
      )}

      <div className={`transition-[padding] duration-200 ${collapsed ? "md:ps-[100px]" : "md:ps-[284px]"}`}>
        <header className="sticky top-0 z-20 px-3 pt-3 md:pe-3">
          <div className="glass flex items-center gap-2 px-3 py-2" style={{ borderRadius: 20 }}>
            <button className="btn btn-ghost btn-icon md:hidden" onClick={() => setDrawer(true)} aria-label="باز کردن منو"><Menu size={20} /></button>
            <form action="/search" className="relative max-w-md flex-1" role="search">
              <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
              <input name="q" value={q} onChange={(e) => setQ(e.target.value)} className="input !min-h-[40px] !ps-10" placeholder="جست‌وجو در منابع، آزمون‌ها، نکته‌ها…" aria-label="جست‌وجو" />
            </form>
            <div className="flex-1" />
            <div ref={popRef} className="relative flex items-center gap-1">
              <ThemeToggle />
              <button className="btn btn-ghost btn-icon relative" onClick={openBell} aria-label="اعلان‌ها" aria-expanded={bell}><Bell size={19} /></button>
              {bell && (
                <div className="glass-float pop-in absolute end-0 top-12 z-40 w-[min(360px,90vw)] p-2">
                  <div className="px-3 py-2 text-sm font-extrabold">اعلان‌ها</div>
                  {notifs === null ? <div className="skeleton m-2 h-16" /> : notifs.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted">اعلان تازه‌ای وجود ندارد.</div>
                  ) : (
                    <ul className="m-0 max-h-80 list-none overflow-y-auto p-0">
                      {notifs.map((n) => (
                        <li key={n.id}>
                          <Link href={n.href} className="block rounded-xl px-3 py-2 hover:bg-[var(--brand-soft)]">
                            <div className="text-sm font-bold">{n.title}</div>
                            <div className="line-clamp-2 text-xs text-muted">{n.body}</div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <button className="btn btn-ghost !px-2" onClick={() => { setMenu(!menu); setBell(false); }} aria-expanded={menu} aria-label="منوی حساب">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--brand)] text-sm font-extrabold text-white">{user.name.trim().slice(0, 1)}</span>
                <span className="hidden max-w-28 truncate text-sm sm:inline">{user.name}</span>
              </button>
              {menu && (
                <div className="glass-float pop-in absolute end-0 top-12 z-40 w-60 p-2">
                  <div className="px-3 py-2"><div className="font-bold">{user.name}</div><div className="text-xs text-muted">{user.roleName}</div></div>
                  <Link href="/profile" className="nav-link">حساب کاربری</Link>
                  {canAdmin && <Link href={admin ? "/dashboard" : "/admin"} className="nav-link">{admin ? "نمای دانش‌آموز" : "پنل مدیریت"}</Link>}
                  <button className="nav-link w-full text-danger" onClick={logout}><LogOut size={18} />خروج</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-6 md:pe-6 md:pb-10">{children}</main>
      </div>

      <nav aria-label="ناوبری موبایل" className="glass-float safe-b !fixed inset-x-3 bottom-3 z-30 flex justify-around p-1.5 md:hidden" style={{ borderRadius: 22 }}>
        {mobileItems.map((it) => {
          const Icon = ICONS[it.icon] ?? FileText;
          return (
            <Link key={it.href} href={it.href} aria-current={active(it.href) ? "page" : undefined} className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-bold text-muted aria-[current=page]:bg-[var(--brand-soft)] aria-[current=page]:text-brand">
              <Icon size={20} /><span>{it.label.replace("ChatGPT - ", "").replace("و نتایج", "")}</span>
            </Link>
          );
        })}
        <button onClick={() => setDrawer(true)} className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 text-[11px] font-bold text-muted"><Menu size={20} /><span>بیشتر</span></button>
      </nav>
      <span className="hidden">{fa(0)}</span>
    </div>
  );
}
