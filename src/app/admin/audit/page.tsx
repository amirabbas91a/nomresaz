import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { formatJalali } from "@/lib/jalali";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "ثبت رویدادها" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  await requireAdminPage("audit");
  const f = (await searchParams).result;
  const rows = await db.select().from(auditLogs).where(f === "ok" || f === "denied" || f === "failed" ? eq(auditLogs.result, f) : undefined).orderBy(desc(auditLogs.createdAt)).limit(300);
  return (
    <>
      <PageHeader title="ثبت رویدادها" subtitle="کاربر، زمان، عملیات، رکورد، نتیجه و دلیل. رمز و توکن هرگز ثبت نمی‌شود." />
      <div className="mb-4 flex flex-wrap gap-2">{[["", "همه"], ["ok", "موفق"], ["denied", "ردشده"], ["failed", "ناموفق"]].map(([k, l]) => <Link key={k} className="chip" aria-pressed={(f ?? "") === k} href={k ? `/admin/audit?result=${k}` : "/admin/audit"}>{l}</Link>)}</div>
      {rows.length === 0 ? <Empty title="رویدادی ثبت نشده" /> : (
        <div className="glass-solid tbl-wrap"><table className="tbl"><thead><tr><th>زمان</th><th>کاربر</th><th>عملیات</th><th>رکورد</th><th>نتیجه</th><th>دلیل</th></tr></thead><tbody>
          {rows.map((l) => <tr key={l.id}><td className="whitespace-nowrap text-xs text-muted">{formatJalali(l.createdAt, true)}</td><td>{l.userName ?? "سیستم"}</td><td className="ltr text-end">{l.action}</td><td className="ltr text-end text-xs">{l.entity ? `${l.entity}${l.entityId ? `#${l.entityId.slice(0, 8)}` : ""}` : "—"}</td><td><span className={l.result === "ok" ? "badge badge-ok" : "badge badge-danger"}>{l.result === "ok" ? "موفق" : l.result === "denied" ? "ردشده" : "ناموفق"}</span></td><td className="max-w-[260px] truncate text-xs text-muted" title={l.reason ?? ""}>{l.reason ?? "—"}</td></tr>)}
        </tbody></table></div>
      )}
    </>
  );
}
