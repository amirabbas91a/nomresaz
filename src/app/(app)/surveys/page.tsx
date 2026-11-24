import Link from "next/link";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { fa, formatJalali } from "@/lib/jalali";
import { Empty, PageHeader } from "@/components/ui";
import { createHash } from "node:crypto";

export const metadata = { title: "نظرسنجی‌ها" };

export default async function SurveysPage() {
  const user = await requireUser();
  await gate("surveys");
  const now = new Date();
  const rows = await db.select().from(surveys).where(and(eq(surveys.status, "published"), or(isNull(surveys.startsAt), lte(surveys.startsAt, now)), or(isNull(surveys.endsAt), gte(surveys.endsAt, now)))).orderBy(desc(surveys.createdAt));
  const keys = rows.map((s) => createHash("sha256").update(`${user.id}:${s.id}:${process.env.SURVEY_SALT ?? "nomresaz"}`).digest("hex"));
  const answered = new Set((await db.select({ k: surveyResponses.respondentKey }).from(surveyResponses)).filter((r) => keys.includes(r.k)).map((r) => r.k));
  return (
    <>
      <PageHeader title="نظرسنجی‌ها" subtitle="نظر تو برای بهتر شدن نمره‌ساز مهم است" />
      {rows.length === 0 ? <Empty title="نظرسنجی بازی وجود ندارد" /> : (
        <div className="grid gap-4 md:grid-cols-2">{rows.map((s, i) => (
          <Link key={s.id} href={`/surveys/${s.id}`} className="glass card-hover fade-up block p-5">
            <div className="flex items-start justify-between gap-2"><h3 className="m-0 font-extrabold">{s.title}</h3>{answered.has(keys[i]) ? <span className="badge badge-ok">پاسخ داده‌اید</span> : <span className="badge badge-info">باز</span>}</div>
            {s.description && <p className="mb-0 mt-2 line-clamp-2 text-sm text-muted">{s.description}</p>}
            <div className="mt-3 flex gap-2 text-xs text-faint"><span>{fa(s.questions.length)} پرسش</span>{s.anonymous && <span>· ناشناس</span>}{s.endsAt && <span>· تا {formatJalali(s.endsAt)}</span>}</div>
          </Link>
        ))}</div>
      )}
    </>
  );
}
