import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { formatJalali } from "@/lib/jalali";
import { ActionButton } from "@/components/SimpleActions";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "صفحه‌ها" };

export default async function AdminPages() {
  await requireAdminPage("appearance");
  const rows = await db.select().from(pages).orderBy(desc(pages.createdAt));
  return (
    <>
      <PageHeader title="صفحه‌ها" subtitle="نقطه اصلی ساخت صفحه، دستیار «ChatGPT - نمره‌ساز» است؛ اینجا پیش‌نویس‌ها را ویرایش و منتشر کنید." actions={<><Link href="/admin/assistant" className="btn">ساخت با دستیار</Link><ActionButton url="/api/pages" label="صفحه خالی" icon="plus" className="btn btn-primary" redirectTo="/admin/pages/{id}" /></>} />
      {rows.length === 0 ? <Empty title="صفحه‌ای ساخته نشده" /> : (
        <div className="glass-solid tbl-wrap"><table className="tbl"><thead><tr><th>عنوان</th><th>نشانی</th><th>بلوک‌ها</th><th>وضعیت</th><th>ساخت</th><th></th></tr></thead><tbody>
          {rows.map((p) => <tr key={p.id}><td className="font-bold">{p.title}</td><td className="ltr text-end">/p/{p.slug}</td><td>{p.blocks.length}</td><td><StatusBadge status={p.status} /></td><td className="text-xs text-muted">{formatJalali(p.createdAt)}</td><td><Link href={`/admin/pages/${p.id}`} className="btn btn-sm">ویرایش</Link></td></tr>)}
        </tbody></table></div>
      )}
    </>
  );
}
