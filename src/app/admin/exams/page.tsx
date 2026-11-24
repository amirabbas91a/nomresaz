import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { examAttempts, exams, subjects } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { fa, formatJalali } from "@/lib/jalali";
import { ActionButton } from "@/components/SimpleActions";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "آزمون‌ها" };

export default async function AdminExams() {
  await requireAdminPage("exams");
  const rows = await db
    .select({ e: exams, sub: subjects.name, attempts: count(examAttempts.id) })
    .from(exams)
    .leftJoin(subjects, eq(subjects.id, exams.subjectId))
    .leftJoin(examAttempts, eq(examAttempts.examId, exams.id))
    .groupBy(exams.id, subjects.name)
    .orderBy(desc(exams.createdAt));
  return (
    <>
      <PageHeader title="آزمون‌ها و نتایج" subtitle="ساخت، انتشار و تصحیح آزمون" actions={<ActionButton url="/api/exams" label="آزمون جدید" icon="plus" className="btn btn-primary" redirectTo="/admin/exams/{id}" />} />
      {rows.length === 0 ? <Empty title="آزمونی ساخته نشده" text="با دکمه «آزمون جدید» شروع کنید." /> : (
        <div className="glass-solid tbl-wrap"><table className="tbl">
          <thead><tr><th>عنوان</th><th>درس</th><th>سؤال</th><th>مدت</th><th>شرکت‌ها</th><th>وضعیت</th><th>ساخت</th><th>عملیات</th></tr></thead>
          <tbody>{rows.map(({ e, sub, attempts }) => (
            <tr key={e.id}><td className="font-bold">{e.title}</td><td>{sub ?? "—"}</td><td>{fa(e.questions.length)}</td><td>{fa(e.durationMin)} دقیقه</td><td>{fa(attempts)}</td><td><StatusBadge status={e.status} /></td><td className="text-xs text-muted">{formatJalali(e.createdAt)}</td>
              <td><div className="flex gap-1"><Link href={`/admin/exams/${e.id}`} className="btn btn-sm">ویرایش</Link><Link href={`/admin/exams/${e.id}/results`} className="btn btn-sm">نتایج</Link></div></td></tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
