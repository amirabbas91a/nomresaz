import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { fa } from "@/lib/jalali";
import { SurveyBuilder, type SurveyData } from "@/components/SurveyBuilder";
import { PageHeader, SectionTitle } from "@/components/ui";

export default async function SurveyEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("surveys");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [s] = await db.select().from(surveys).where(eq(surveys.id, id));
  if (!s) notFound();
  const resp = await db.select().from(surveyResponses).where(eq(surveyResponses.surveyId, id));
  const data: SurveyData = { id: s.id, title: s.title, description: s.description, startsAt: s.startsAt?.toISOString() ?? null, endsAt: s.endsAt?.toISOString() ?? null, anonymous: s.anonymous, status: s.status as SurveyData["status"], questions: s.questions };
  return (
    <>
      <PageHeader title="ویرایش نظرسنجی" />
      <SurveyBuilder initial={data} />
      <section className="mt-10">
        <SectionTitle>نتایج ({fa(resp.length)} پاسخ)</SectionTitle>
        {resp.length === 0 ? <div className="glass-2 p-6 text-center text-sm text-muted">هنوز پاسخی ثبت نشده است.</div> : (
          <div className="grid gap-4">{s.questions.map((q) => {
            const vals = resp.map((r) => r.answers[q.id]).filter((v) => v !== undefined);
            return (
              <div key={q.id} className="glass-solid p-5"><div className="mb-3 font-bold">{q.text} <span className="badge">{fa(vals.length)} پاسخ</span></div>
                {(q.type === "single" || q.type === "multi") && q.options?.map((o, oi) => {
                  const n = vals.filter((v) => (Array.isArray(v) ? v.includes(oi) : v === oi)).length;
                  const pct = vals.length ? Math.round((n / vals.length) * 100) : 0;
                  return <div key={oi} className="mb-2"><div className="flex justify-between text-sm"><span>{o}</span><span>{fa(n)} ({fa(pct)}٪)</span></div><div className="h-2.5 overflow-hidden rounded-full bg-[var(--glass-bg-2)]"><div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${pct}%` }} /></div></div>;
                })}
                {q.type === "scale" && <div className="text-sm">میانگین: <b>{vals.length ? fa((vals.reduce((a: number, v) => a + Number(v), 0) / vals.length).toFixed(2)) : "—"}</b> از ۵</div>}
                {q.type === "text" && <ul className="m-0 grid max-h-60 gap-2 overflow-y-auto p-0">{vals.map((v, i) => <li key={i} className="list-none rounded-xl bg-[var(--input-bg)] p-3 text-sm">{String(v)}</li>)}</ul>}
              </div>
            );
          })}</div>
        )}
      </section>
    </>
  );
}
