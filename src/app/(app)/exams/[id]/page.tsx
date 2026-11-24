import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { AlertTriangle, Clock, HelpCircle, Repeat } from "lucide-react";
import { db } from "@/db";
import { examAttempts, exams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { fa, formatJalali } from "@/lib/jalali";
import { ActionButton } from "@/components/SimpleActions";
import { PageHeader } from "@/components/ui";

export default async function ExamIntro({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await gate("exams");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [e] = await db.select().from(exams).where(eq(exams.id, id));
  if (!e || e.status !== "published") notFound();
  const attempts = await db.select().from(examAttempts).where(and(eq(examAttempts.examId, id), eq(examAttempts.userId, user.id))).orderBy(desc(examAttempts.id));
  const now = new Date();
  const notStarted = !!e.startsAt && e.startsAt > now;
  const ended = !!e.endsAt && e.endsAt < now;
  const used = attempts.length;
  const open = attempts.find((a) => a.status === "in_progress" && a.startedAt.getTime() + e.durationMin * 60_000 + 30_000 > now.getTime());
  const exhausted = used >= e.maxAttempts && !open;
  const can = !notStarted && !ended && !exhausted;
  return (
    <>
      <PageHeader title={e.title} subtitle={e.chapter ?? undefined} />
      <div className="mx-auto grid max-w-2xl gap-5">
        <section className="glass-solid p-6">
          <h2 className="mt-0 text-lg font-extrabold">قوانین آزمون</h2>
          <ul className="m-0 grid list-none gap-3 p-0 text-sm">
            <li className="flex items-center gap-3"><Clock size={18} className="text-brand" />مدت آزمون: {fa(e.durationMin)} دقیقه؛ شمارش معکوس از لحظه شروع آغاز می‌شود.</li>
            <li className="flex items-center gap-3"><HelpCircle size={18} className="text-brand" />{fa(e.questions.length)} سؤال با جمع بارم {fa(e.questions.reduce((s, q) => s + q.marks, 0))}</li>
            <li className="flex items-center gap-3"><Repeat size={18} className="text-brand" />حداکثر {fa(e.maxAttempts)} بار شرکت ({fa(used)} بار استفاده شده)</li>
            <li className="flex items-center gap-3"><AlertTriangle size={18} className="text-warn" />پاسخ‌ها به‌صورت خودکار ذخیره می‌شوند و با پایان زمان، آزمون به‌طور خودکار ارسال می‌شود. ارسال دوباره ممکن نیست.</li>
          </ul>
          {e.description && <p className="mb-0 mt-4 whitespace-pre-line text-sm text-muted">{e.description}</p>}
          {(e.startsAt || e.endsAt) && <p className="mb-0 mt-3 text-xs text-faint">بازه: {formatJalali(e.startsAt, true)} تا {formatJalali(e.endsAt, true)}</p>}
        </section>
        {notStarted && <div className="badge badge-warn !rounded-xl !px-3 !py-2">این آزمون هنوز شروع نشده است.</div>}
        {ended && <div className="badge badge-danger !rounded-xl !px-3 !py-2">مهلت این آزمون پایان یافته است.</div>}
        {exhausted && !ended && <div className="badge badge-warn !rounded-xl !px-3 !py-2">تعداد دفعات مجاز تمام شده است.</div>}
        <div className="flex justify-center">
          {can && <ActionButton url={`/api/exams/${id}/start`} label={open ? "ادامه آزمون" : "شروع آزمون"} className="btn btn-primary !min-h-[50px] !px-10 !text-base" redirectTo={`/exams/${id}/take/{id}`} />}
        </div>
      </div>
    </>
  );
}
