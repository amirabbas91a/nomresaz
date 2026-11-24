export type NavItem = { href: string; label: string; icon: string; feature?: string; perm?: string; mobile?: boolean };
export type NavGroup = { title: string; items: NavItem[] };

export const STUDENT_NAV: NavGroup[] = [
  {
    title: "یادگیری",
    items: [
      { href: "/dashboard", label: "داشبورد", icon: "dashboard", mobile: true },
      { href: "/library", label: "کتابخانه", icon: "library", feature: "library", mobile: true },
      { href: "/tips", label: "نکته‌های درسی", icon: "tips", feature: "tips" },
      { href: "/notes", label: "یادداشت", icon: "notes", feature: "notes" },
    ],
  },
  {
    title: "پیشرفت",
    items: [
      { href: "/assignments", label: "تکالیف", icon: "assignments", feature: "assignments", mobile: true },
      { href: "/exams", label: "آزمون‌ها", icon: "exams", feature: "exams", mobile: true },
      { href: "/surveys", label: "نظرسنجی‌ها", icon: "surveys", feature: "surveys" },
      { href: "/leaderboard", label: "رتبه‌بندی و نشان‌ها", icon: "trophy", feature: "leaderboard" },
    ],
  },
  {
    title: "جامعه",
    items: [
      { href: "/calendar", label: "تقویم", icon: "calendar", feature: "calendar" },
      { href: "/announcements", label: "اطلاعیه‌ها", icon: "megaphone", feature: "announcements" },
      { href: "/contests", label: "مسابقات و برنامه‌ها", icon: "flag", feature: "contests" },
      { href: "/suggestions", label: "پیشنهادها", icon: "message", feature: "suggestions" },
      { href: "/search", label: "جست‌وجو", icon: "search", feature: "search" },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    title: "نمای کلی",
    items: [
      { href: "/admin", label: "داشبورد مدیریت", icon: "dashboard", mobile: true },
      { href: "/admin/reports", label: "گزارش‌ها", icon: "chart", perm: "audit" },
      { href: "/admin/assistant", label: "ChatGPT - نمره‌ساز", icon: "bot", perm: "ai", feature: "ai", mobile: true },
    ],
  },
  {
    title: "محتوا",
    items: [
      { href: "/admin/subjects", label: "درس‌ها و استادان", icon: "book", perm: "subjects" },
      { href: "/admin/library", label: "منابع کتابخانه", icon: "library", perm: "library", mobile: true },
      { href: "/admin/tips", label: "نکته‌های درسی", icon: "tips", perm: "subjects" },
      { href: "/admin/notebooks", label: "نکته‌نامه‌ها", icon: "notebook", perm: "notebooks" },
      { href: "/admin/assignments", label: "تکالیف", icon: "assignments", perm: "assignments" },
      { href: "/admin/pages", label: "صفحه‌ها", icon: "file", perm: "appearance" },
    ],
  },
  {
    title: "آموزش",
    items: [
      { href: "/admin/exams", label: "آزمون‌ها و نتایج", icon: "exams", perm: "exams", mobile: true },
      { href: "/admin/points", label: "امتیازها", icon: "trophy", perm: "results" },
      { href: "/admin/surveys", label: "نظرسنجی‌ها", icon: "surveys", perm: "surveys" },
    ],
  },
  {
    title: "ارتباط",
    items: [
      { href: "/admin/announcements", label: "اطلاعیه‌ها", icon: "megaphone", perm: "announcements" },
      { href: "/admin/events", label: "رویدادهای تقویم", icon: "calendar", perm: "calendar" },
      { href: "/admin/contests", label: "مسابقات", icon: "flag", perm: "contests" },
      { href: "/admin/programs", label: "برنامه‌ها و آیه‌ها", icon: "sparkles", perm: "contests" },
      { href: "/admin/ads", label: "تبلیغات", icon: "ad", perm: "ads" },
      { href: "/admin/suggestions", label: "پیشنهادها", icon: "message", perm: "suggestions" },
    ],
  },
  {
    title: "سامانه",
    items: [
      { href: "/admin/users", label: "کاربران و نقش‌ها", icon: "users", perm: "users" },
      { href: "/admin/appearance", label: "ظاهر و صفحه اصلی", icon: "palette", perm: "appearance" },
      { href: "/admin/features", label: "مرکز قابلیت‌ها", icon: "toggle", perm: "settings" },
      { href: "/admin/audit", label: "ثبت رویدادها", icon: "shield", perm: "audit" },
    ],
  },
];
