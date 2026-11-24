# نمره‌ساز (Nomresaz)

پلتفرم آموزشی فارسی برای پایه نهم؛ Next.js (App Router) + TypeScript + Drizzle ORM + PostgreSQL + Tailwind CSS (طراحی Liquid Glass).

## اجرای محلی
```bash
cp .env.example .env     # DATABASE_URL را تنظیم کنید
npm install
npx drizzle-kit push     # ساخت جدول‌ها (src/db/schema.ts)
npm run dev
```
نخستین حساب ثبت‌نام‌شده «مالک اصلی» می‌شود (یا فقط ایمیل `OWNER_EMAIL`). هیچ رمز پیش‌فرضی وجود ندارد.

## استقرار روی Vercel
1. مخزن را به Vercel متصل کنید (Framework: Next.js).
2. یک PostgreSQL مدیریت‌شده (Supabase/Neon) بسازید و `DATABASE_URL` را در Environment Variables (Development/Preview/Production) تنظیم کنید.
3. یک‌بار `DATABASE_URL=… npx drizzle-kit push` را اجرا کنید (یا `drizzle-kit generate` + migrate).
4. ابتدا Preview Deployment بسازید و مسیرها را آزمایش کنید، سپس Production.

نکته: Vercel حجم بدنه درخواست را حدود ۴٫۵ مگابایت محدود می‌کند؛ بنابراین حداکثر حجم فایل ۴ مگابایت است. فایل‌ها در جدول `files` (PostgreSQL) ذخیره می‌شوند؛ برای فایل‌های حجیم‌تر باید به Supabase Storage / S3 مهاجرت کرد.

## متغیرهای محیطی
`DATABASE_URL`، `OWNER_EMAIL`، `OPENAI_API_KEY`، `OPENAI_MODEL`، `OPENAI_STT_MODEL`، `OPENAI_BASE_URL`، `BALE_BOT_TOKEN`، `BALE_CHAT_ID`، `SURVEY_SALT` — مقدار نمونه در `.env.example`.

## پایگاه داده
جدول‌ها: users, sessions, roles, subjects, files, resources, tips, notes, assignments, assignment_done, notebooks, exams, exam_attempts, point_events, user_badges, surveys, survey_responses, events, announcements, ads, suggestions, contests, contest_entries, programs, pages, audit_logs, settings, features, ai_conversations, ai_messages. طرح در `src/db/schema.ts`.

## امنیت
رمز با scrypt، نشست httpOnly با هش توکن در پایگاه داده، کنترل مجوز در سرور برای همه APIها، بررسی Origin، Rate limit (در حافظه؛ برای چند نمونه سرور به Redis نیاز است)، اعتبارسنجی Zod، بررسی نوع/حجم/امضای فایل، ثبت رویدادهای حساس، تأیید مجدد رمز برای تغییر نقش. ورود دومرحله‌ای (MFA) پیاده‌سازی نشده است.

## وضعیت قابلیت‌ها
پیاده‌سازی‌شده: ثبت‌نام/ورود، نقش‌ها و مجوزها، درس‌ها، کتابخانه، نکته‌های درسی، یادداشت، تکالیف، آزمون‌ساز و آزمون آنلاین، امتیاز/رتبه‌بندی/نشان، نظرسنجی، تقویم شمسی، اطلاعیه، تبلیغات، مسابقات، برنامه‌ها، پیشنهادها، جست‌وجو، نکته‌نامه‌ساز + DOCX، صفحه‌ساز مبتنی بر بلوک، مرکز قابلیت‌ها، گزارش‌ها، پشتیبان JSON.
نیازمند سرویس: دستیار AI، OCR، تبدیل گفتار، ویراستار هوشمند، تولید سؤال (OPENAI_API_KEY)، ارسال به بله (BALE_BOT_TOKEN).
پیاده‌سازی‌نشده: خروجی PDF، MFA، دریافت خودکار تکلیف از کانال بله، چرخش/بهبود تصویر در نکته‌نامه‌ساز، صف پردازش پس‌زمینه.
