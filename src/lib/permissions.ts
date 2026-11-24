export const PERMISSIONS = [
  { key: "users", label: "مدیریت کاربران و نقش‌ها" },
  { key: "subjects", label: "مدیریت درس‌ها و نکته‌های درسی" },
  { key: "library", label: "مدیریت کتابخانه" },
  { key: "notebooks", label: "بررسی و انتشار نکته‌نامه" },
  { key: "assignments", label: "مدیریت تکالیف" },
  { key: "exams", label: "ساخت و مدیریت آزمون" },
  { key: "results", label: "نتایج، تصحیح و امتیازها" },
  { key: "surveys", label: "مدیریت نظرسنجی" },
  { key: "calendar", label: "مدیریت تقویم" },
  { key: "ads", label: "مدیریت تبلیغات" },
  { key: "announcements", label: "مدیریت اطلاعیه‌ها" },
  { key: "contests", label: "مسابقات و برنامه‌های ویژه" },
  { key: "suggestions", label: "بررسی پیشنهادها" },
  { key: "appearance", label: "مدیریت ظاهر و صفحه اصلی" },
  { key: "settings", label: "تنظیمات و مرکز قابلیت‌ها" },
  { key: "ai", label: "دستیار هوش مصنوعی" },
  { key: "audit", label: "گزارش‌ها و ثبت رویدادها" },
] as const;

export type PermKey = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMS: string[] = PERMISSIONS.map((p) => p.key);

export const DEFAULT_ROLES = [
  { key: "owner", name: "مالک اصلی", permissions: ALL_PERMS, isSystem: true },
  {
    key: "admin",
    name: "مدیر",
    permissions: ["subjects", "library", "notebooks", "assignments", "exams", "results", "surveys", "calendar", "announcements", "contests", "suggestions"],
    isSystem: true,
  },
  { key: "student", name: "دانش‌آموز", permissions: [], isSystem: true },
];
