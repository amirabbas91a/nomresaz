import { notFound } from "next/navigation";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { SurveyForm } from "@/components/SurveyForm";
import { PageHeader } from "@/components/ui";
import { Check } from "lucide-react";

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  await gate("surveys");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [s] = await db.select().from(surveys).where(eq(surveys.id, id));
  if (!s || s.status !== "published") notFound();
  const key = createHash("sha256").update(`${user.id}:${id}:${process.env.SURVEY_SALT ?? "nomresaz"}`).digest("hex");
  const rows = await db.select({ k: surveyResponses.respondentKey }).from(surveyResponses).where(eq(surveyResponses.surveyId, id));
  const answered = rows.some((r) => r.k === key);
  const now = new Date();
  const closed = (s.startsAt && s.startsAt > now) || (s.endsAt && s.endsAt < now);
  return (
    <>
      <PageHeader title={s.title} subtitle={s.description ?? undefined} />
      <div className="mx-auto max-w-2xl">
        {answered ? <div className="glass p-8 text-center"><Check className="mx-auto text-ok" size={36} /><p className="font-bold">قبلاً به این نظرسنجی پاسخ داده‌اید. سپاس!</p></div>
          : closed ? <div className="glass p-8 text-center">این نظرسنجی در حال حاضر باز نیست.</div>
          : <SurveyForm id={id} questions={s.questions} anonymous={s.anonymous} />}
      </div>
    </>
  );
}
