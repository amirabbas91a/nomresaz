import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { exams, subjects } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { ExamBuilder, type ExamData } from "@/components/ExamBuilder";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "ویرایش آزمون" };

export default async function ExamEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("exams");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [e] = await db.select().from(exams).where(eq(exams.id, id));
  if (!e) notFound();
  const subs = await db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.sortOrder));
  const initial: ExamData = {
    id: e.id, title: e.title, description: e.description, subjectId: e.subjectId, chapter: e.chapter, durationMin: e.durationMin, maxAttempts: e.maxAttempts,
    startsAt: e.startsAt?.toISOString() ?? null, endsAt: e.endsAt?.toISOString() ?? null, showResult: e.showResult, awardPoints: e.awardPoints,
    status: e.status as ExamData["status"], questions: e.questions,
  };
  return (
    <>
      <PageHeader title="آزمون‌ساز" subtitle="سؤال‌ها را اضافه، جابه‌جا و پیش‌نمایش کنید" />
      <ExamBuilder initial={initial} subjects={subs} />
    </>
  );
}
