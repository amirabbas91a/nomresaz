import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { formatJalali } from "@/lib/jalali";
import { SuggestionForm } from "@/components/SuggestionForm";
import { PageHeader, SectionTitle, StatusBadge } from "@/components/ui";

export const metadata = { title: "پیشنهادها" };

export default async function SuggestionsPage() {
  const user = await requireUser();
  await gate("suggestions");
  const mine = await db.select().from(suggestions).where(eq(suggestions.userId, user.id)).orderBy(desc(suggestions.createdAt)).limit(20);
  return (
    <>
      <PageHeader title="پیشنهادها و گزارش مشکل" subtitle="نظرت را بنویس؛ مدیران بررسی می‌کنند." />
      <div className="mx-auto grid max-w-2xl gap-8">
        <SuggestionForm />
        {mine.length > 0 && <section><SectionTitle>ارسال‌های من</SectionTitle><div className="grid gap-3">{mine.map((s) => (
          <article key={s.id} className="glass p-4"><div className="flex items-center justify-between"><StatusBadge status={s.status} /><span className="text-xs text-faint">{formatJalali(s.createdAt)}</span></div><p className="mb-0 mt-2 text-sm">{s.body}</p>{s.reply && <div className="mt-2 rounded-xl bg-[var(--brand-soft)] p-3 text-sm"><b>پاسخ مدیر: </b>{s.reply}</div>}</article>
        ))}</div></section>}
      </div>
    </>
  );
}
