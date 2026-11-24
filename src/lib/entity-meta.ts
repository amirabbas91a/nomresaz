// Client-safe description of admin-managed entities. Server-side enforcement lives in entity-server.ts.
export type FieldType = "text" | "textarea" | "number" | "select" | "date" | "datetime" | "boolean" | "color" | "url" | "image" | "file" | "subject";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  readonly?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  table?: boolean;
  default?: unknown;
};

export type EntityMeta = {
  key: string;
  title: string;
  singular: string;
  perm: string;
  fields: Field[];
  canCreate?: boolean;
  description?: string;
};

const statusOpts = (...v: [string, string][]) => v.map(([value, label]) => ({ value, label }));

export const ENTITIES: Record<string, EntityMeta> = {
  subjects: {
    key: "subjects", title: "درس‌ها و استادان", singular: "درس", perm: "subjects",
    description: "نام درس، استاد، تصویر و ترتیب از همین‌جا تغییر می‌کند.",
    fields: [
      { key: "name", label: "نام درس", type: "text", required: true, table: true },
      { key: "teacher", label: "استاد", type: "text", table: true },
      { key: "description", label: "توضیح", type: "textarea" },
      { key: "imageUrl", label: "تصویر", type: "image" },
      { key: "sortOrder", label: "ترتیب", type: "number", default: 0, table: true },
      { key: "active", label: "فعال", type: "boolean", default: true, table: true },
    ],
  },
  library: {
    key: "library", title: "منابع کتابخانه", singular: "منبع", perm: "library",
    description: "منابع در دسته درس مربوط قرار می‌گیرند و فقط پس از انتشار برای دانش‌آموزان نمایش داده می‌شوند.",
    fields: [
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "subjectId", label: "درس", type: "subject", table: true },
      { key: "chapter", label: "فصل", type: "text", table: true },
      { key: "kind", label: "نوع", type: "select", default: "pdf", table: true, options: statusOpts(["pdf", "PDF"], ["handout", "جزوه"], ["sample", "نمونه سؤال"], ["answers", "پاسخ‌نامه"], ["image", "تصویر"], ["slides", "ارائه"], ["video", "ویدئو"], ["other", "فایل مجاز دیگر"]) },
      { key: "description", label: "توضیح", type: "textarea" },
      { key: "fileId", label: "فایل (حداکثر ۴ مگابایت)", type: "file", table: true },
      { key: "externalUrl", label: "یا پیوند خارجی مجاز", type: "url", help: "برای ویدئوها یا فایل‌های حجیم؛ فقط منبعی که حق انتشار آن را دارید." },
      { key: "status", label: "وضعیت", type: "select", default: "draft", table: true, options: statusOpts(["draft", "پیش‌نویس"], ["published", "منتشرشده"], ["archived", "بایگانی"]) },
    ],
  },
  tips: {
    key: "tips", title: "نکته‌های درسی", singular: "نکته", perm: "subjects",
    description: "محتوای کوتاه موضوعی؛ جدول تناوبی، فرمول‌ها، واژگان و قواعد.",
    fields: [
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "subjectId", label: "درس", type: "subject", table: true },
      { key: "chapter", label: "فصل", type: "text", table: true },
      { key: "topic", label: "موضوع", type: "text", table: true },
      { key: "body", label: "متن نکته", type: "textarea", required: true },
      { key: "status", label: "وضعیت", type: "select", default: "published", table: true, options: statusOpts(["draft", "پیش‌نویس"], ["published", "منتشرشده"]) },
    ],
  },
  assignments: {
    key: "assignments", title: "تکالیف", singular: "تکلیف", perm: "assignments",
    fields: [
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "subjectId", label: "درس", type: "subject", table: true },
      { key: "description", label: "توضیح", type: "textarea" },
      { key: "assignDate", label: "تاریخ تعیین", type: "date" },
      { key: "dueDate", label: "مهلت", type: "datetime", table: true },
      { key: "fileId", label: "فایل پیوست", type: "file" },
      { key: "status", label: "وضعیت", type: "select", default: "active", table: true, options: statusOpts(["active", "فعال"], ["archived", "بایگانی"]) },
    ],
  },
  announcements: {
    key: "announcements", title: "اطلاعیه‌ها", singular: "اطلاعیه", perm: "announcements",
    fields: [
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "body", label: "متن", type: "textarea", required: true },
      { key: "link", label: "پیوند", type: "url" },
      { key: "imageUrl", label: "تصویر", type: "image" },
      { key: "pinned", label: "برجسته", type: "boolean", default: false, table: true },
      { key: "status", label: "وضعیت", type: "select", default: "draft", table: true, options: statusOpts(["draft", "پیش‌نویس"], ["published", "منتشرشده"], ["archived", "بایگانی"]) },
    ],
  },
  events: {
    key: "events", title: "رویدادهای تقویم", singular: "رویداد", perm: "calendar",
    fields: [
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "startsAt", label: "شروع", type: "datetime", required: true, table: true },
      { key: "endsAt", label: "پایان", type: "datetime" },
      { key: "category", label: "دسته", type: "select", default: "general", table: true, options: statusOpts(["general", "عمومی"], ["exam", "آزمون"], ["holiday", "تعطیلی"], ["class", "کلاس"], ["deadline", "مهلت"]) },
      { key: "color", label: "رنگ", type: "color", default: "#2358e8" },
      { key: "description", label: "توضیح", type: "textarea" },
    ],
  },
  contests: {
    key: "contests", title: "مسابقات", singular: "مسابقه", perm: "contests",
    fields: [
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "description", label: "توضیح / مأموریت", type: "textarea" },
      { key: "rules", label: "قوانین", type: "textarea" },
      { key: "startsAt", label: "شروع", type: "datetime", table: true },
      { key: "endsAt", label: "مهلت", type: "datetime", table: true },
      { key: "points", label: "امتیاز شرکت", type: "number", default: 0, table: true },
      { key: "status", label: "وضعیت", type: "select", default: "draft", table: true, options: statusOpts(["draft", "پیش‌نویس"], ["published", "منتشرشده"], ["archived", "بایگانی"]) },
    ],
  },
  programs: {
    key: "programs", title: "برنامه‌های ویژه و زندگی با آیه‌ها", singular: "برنامه", perm: "contests",
    fields: [
      { key: "kind", label: "نوع", type: "select", default: "special", table: true, options: statusOpts(["special", "برنامه ویژه"], ["ayat", "زندگی با آیه‌ها"]) },
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "body", label: "متن", type: "textarea" },
      { key: "imageUrl", label: "تصویر", type: "image" },
      { key: "sortOrder", label: "ترتیب", type: "number", default: 0, table: true },
      { key: "active", label: "فعال", type: "boolean", default: true, table: true },
    ],
  },
  ads: {
    key: "ads", title: "تبلیغات", singular: "تبلیغ", perm: "ads",
    description: "تبلیغات با برچسب «تبلیغ» نمایش داده می‌شوند. فقط کلیک‌های واقعی شمارش می‌شود.",
    fields: [
      { key: "title", label: "عنوان", type: "text", required: true, table: true },
      { key: "description", label: "توضیح", type: "textarea" },
      { key: "imageUrl", label: "تصویر مجاز", type: "image" },
      { key: "linkUrl", label: "پیوند مقصد", type: "url" },
      { key: "placement", label: "محل نمایش", type: "select", default: "home", table: true, options: statusOpts(["home", "صفحه اصلی"], ["dashboard", "داشبورد دانش‌آموز"]) },
      { key: "startsAt", label: "شروع", type: "datetime" },
      { key: "endsAt", label: "پایان", type: "datetime", table: true },
      { key: "active", label: "فعال", type: "boolean", default: true, table: true },
      { key: "clicks", label: "کلیک‌های ثبت‌شده", type: "number", readonly: true, table: true },
    ],
  },
  suggestions: {
    key: "suggestions", title: "پیشنهادها و گزارش مشکل", singular: "پیشنهاد", perm: "suggestions", canCreate: false,
    description: "نام ارسال‌کننده نمایش داده نمی‌شود تا حریم خصوصی حفظ شود.",
    fields: [
      { key: "category", label: "دسته", type: "select", readonly: true, table: true, options: statusOpts(["suggestion", "پیشنهاد"], ["bug", "گزارش مشکل"], ["content", "محتوا"]) },
      { key: "body", label: "متن", type: "textarea", readonly: true, table: true },
      { key: "status", label: "وضعیت", type: "select", default: "new", table: true, options: statusOpts(["new", "جدید"], ["reviewed", "بررسی‌شده"], ["closed", "بسته"]) },
      { key: "reply", label: "پاسخ مدیر", type: "textarea" },
    ],
  },
};
