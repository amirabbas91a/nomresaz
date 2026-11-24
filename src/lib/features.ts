export type FeatureStatus = "active" | "needs_service" | "dev";

export type FeatureDef = {
  key: string;
  label: string;
  description: string;
  status: FeatureStatus;
  togglable: boolean;
  href?: string;
};

export const FEATURES: FeatureDef[] = [
  { key: "library", label: "کتابخانه منابع", description: "بارگذاری، دسته‌بندی، دانلود و بایگانی منابع آموزشی.", status: "active", togglable: true, href: "/library" },
  { key: "notebook", label: "نکته‌نامه‌ساز", description: "ورود متن، تولید DOCX و درخواست انتشار. OCR، تبدیل گفتار و ویراستار هوشمند نیازمند کلید سرویس هوش مصنوعی هستند.", status: "active", togglable: true, href: "/notebook" },
  { key: "tips", label: "نکته‌های درسی", description: "محتوای کوتاه موضوعی به تفکیک درس و فصل.", status: "active", togglable: true, href: "/tips" },
  { key: "notes", label: "یادداشت", description: "برگه‌های رنگی شخصی با تاریخ شمسی.", status: "active", togglable: true, href: "/notes" },
  { key: "assignments", label: "تکالیف", description: "تکالیف روزانه، مهلت، پیوست و وضعیت انجام.", status: "active", togglable: true, href: "/assignments" },
  { key: "exams", label: "آزمون آنلاین", description: "آزمون‌ساز، آزمون با تایمر، تصحیح خودکار و بررسی تشریحی.", status: "active", togglable: true, href: "/exams" },
  { key: "surveys", label: "نظرسنجی", description: "نظرسنجی چندسؤالی با حالت ناشناس و گزارش نتایج.", status: "active", togglable: true, href: "/surveys" },
  { key: "calendar", label: "تقویم شمسی", description: "نمای روزانه، هفتگی و ماهانه با رویدادها، تکالیف و آزمون‌ها.", status: "active", togglable: true, href: "/calendar" },
  { key: "announcements", label: "اطلاعیه‌ها", description: "اطلاعیه‌های عمومی با برجسته‌سازی و بایگانی.", status: "active", togglable: true, href: "/announcements" },
  { key: "contests", label: "مسابقات و برنامه‌ها", description: "مسابقه، ثبت‌نام، برنامه‌های ویژه و «زندگی با آیه‌ها».", status: "active", togglable: true, href: "/contests" },
  { key: "leaderboard", label: "رتبه‌بندی و نشان‌ها", description: "امتیاز بر پایه رویداد واقعی، با حفظ حریم خصوصی.", status: "active", togglable: true, href: "/leaderboard" },
  { key: "ads", label: "تبلیغات", description: "تبلیغات برچسب‌دار با بازه انتشار. فقط کلیک واقعی شمارش می‌شود.", status: "active", togglable: true },
  { key: "suggestions", label: "پیشنهادها و گزارش مشکل", description: "ارسال ناشناس یا با حساب و پاسخ مدیر.", status: "active", togglable: true, href: "/suggestions" },
  { key: "search", label: "جست‌وجوی سراسری", description: "جست‌وجو در محتوای مجاز برای هر کاربر.", status: "active", togglable: true, href: "/search" },
  { key: "ai", label: "دستیار ChatGPT - نمره‌ساز", description: "دستیار مدیریتی با ابزارهای امن سمت سرور. نیازمند OPENAI_API_KEY.", status: "needs_service", togglable: true, href: "/admin/assistant" },
  { key: "bale_sync", label: "همگام‌سازی خودکار کانال بله", description: "ارسال به کانال با ربات رسمی پشتیبانی می‌شود؛ دریافت خودکار تکلیف از پیام‌های کانال توسعه نیافته است.", status: "dev", togglable: false },
  { key: "pdf_export", label: "خروجی PDF نکته‌نامه", description: "هنوز پیاده‌سازی نشده؛ خروجی DOCX فعال است.", status: "dev", togglable: false },
  { key: "mfa", label: "ورود دومرحله‌ای مالک", description: "در این نسخه پشتیبانی نمی‌شود (نیازمند Supabase Auth یا سرویس TOTP).", status: "dev", togglable: false },
];

export const FEATURE_LABELS: Record<FeatureStatus, string> = {
  active: "پیاده‌سازی‌شده",
  needs_service: "نیازمند سرویس خارجی",
  dev: "در حال توسعه",
};
