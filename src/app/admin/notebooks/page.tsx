import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notebooks, subjects, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { baleConfigured } from "@/lib/bale";
import { formatJalali } from "@/lib/jalali";
import { ActionButton } from "@/components/SimpleActions";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "نکته‌نامه‌ها" };

export default async function AdminNotebooks() {
  await requireAdminPage("notebooks");
  const rows = await db.select({ n: notebooks, sub: subjects.name, owner: users.name }).from(notebooks).innerJoin(users, eq(users.id, notebooks.userId)).leftJoin(subjects, eq(subjects.id, notebooks.subjectId)).orderBy(desc(notebooks.updatedAt)).limit(200);
  const bale = baleConfigured();
  return (
    <>
      <PageHeader title="بررسی و انتشار نکته‌نامه‌ها" subtitle="انتشار فقط پس از پیش‌نمایش و تأیید شما انجام می‌شود. انتشار تکراری مسدود است." />
      {rows.length === 0 ? <Empty title="نکته‌نامه‌ای ثبت نشده" /> : (
        <div className="glass-solid tbl-wrap"><table className="tbl"><thead><tr><th>عنوان</th><th>درس</th><th>سازنده</th><th>وضعیت</th><th>به‌روزرسانی</th><th>عملیات</th></tr></thead><tbody>
          {rows.map(({ n, sub, owner }) => (
            <tr key={n.id}><td className="font-bold">{n.title}</td><td>{sub ?? "—"}</td><td>{owner}</td><td><StatusBadge status={n.status} />{n.baleSentAt && <span className="badge badge-info ms-1">ارسال‌شده به بله</span>}</td><td className="text-xs text-muted">{formatJalali(n.updatedAt)}</td>
              <td><div className="flex flex-wrap gap-1"><Link className="btn btn-sm" href={`/notebook/${n.id}`}>پیش‌نمایش</Link>
                {n.status === "pending" && <>
                  <ActionButton className="btn btn-sm btn-primary" url={`/api/notebooks/${n.id}/status`} body={{ action: "approve" }} label="تأیید و انتشار در سایت" confirmText="این نکته‌نامه برای همه دانش‌آموزان منتشر شود؟" successText="منتشر شد." />
                  {bale && <ActionButton className="btn btn-sm" url={`/api/notebooks/${n.id}/status`} body={{ action: "approve", bale: true }} label="تأیید + ارسال به بله" confirmText="منتشر و به کانال بله ارسال شود؟" successText="منتشر شد." />}
                  <ActionButton className="btn btn-sm btn-danger" url={`/api/notebooks/${n.id}/status`} body={{ action: "reject", note: "نیازمند بازبینی" }} label="رد" confirmText="درخواست رد شود؟" />
                </>}
              </div></td></tr>
          ))}</tbody></table></div>
      )}
    </>
  );
}
