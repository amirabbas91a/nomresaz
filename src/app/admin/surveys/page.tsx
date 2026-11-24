import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { fa } from "@/lib/jalali";
import { ActionButton } from "@/components/SimpleActions";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "نظرسنجی‌ها" };

export default async function AdminSurveys() {
  await requireAdminPage("surveys");
  const rows = await db.select({ s: surveys, n: count(surveyResponses.id) }).from(surveys).leftJoin(surveyResponses, eq(surveyResponses.surveyId, surveys.id)).groupBy(surveys.id).orderBy(desc(surveys.createdAt));
  return (
    <>
      <PageHeader title="نظرسنجی‌ها" actions={<ActionButton url="/api/surveys" label="نظرسنجی جدید" icon="plus" className="btn btn-primary" redirectTo="/admin/surveys/{id}" />} />
      {rows.length === 0 ? <Empty title="نظرسنجی‌ای ساخته نشده" /> : (
        <div className="glass-solid tbl-wrap"><table className="tbl"><thead><tr><th>عنوان</th><th>پرسش‌ها</th><th>پاسخ‌ها</th><th>ناشناس</th><th>وضعیت</th><th></th></tr></thead><tbody>
          {rows.map(({ s, n }) => <tr key={s.id}><td className="font-bold">{s.title}</td><td>{fa(s.questions.length)}</td><td>{fa(n)}</td><td>{s.anonymous ? "بله" : "خیر"}</td><td><StatusBadge status={s.status} /></td><td><Link className="btn btn-sm" href={`/admin/surveys/${s.id}`}>ویرایش و نتایج</Link></td></tr>)}
        </tbody></table></div>
      )}
    </>
  );
}
