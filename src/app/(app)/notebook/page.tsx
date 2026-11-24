import { notFound } from "next/navigation";
import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { NotebookPen } from "lucide-react";
import { db } from "@/db";
import { notebooks, subjects, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { formatJalali } from "@/lib/jalali";
import { ActionButton } from "@/components/SimpleActions";
import { Empty, PageHeader, StatusBadge } from "@/components/ui";

export const metadata = { title: "نکته‌نامه‌ساز" };

export default async function NotebookHome({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser();
  if (!user.permissions.length) notFound();
  await gate("notebook");
  const tab = (await searchParams).tab === "published" ? "published" : "mine";
  const rows = await db.select({ n: notebooks, sub: subjects.name, owner: users.name }).from(notebooks).leftJoin(subjects, eq(subjects.id, notebooks.subjectId)).innerJoin(users, eq(users.id, notebooks.userId))
    .where(tab === "mine" ? eq(notebooks.userId, user.id) : eq(notebooks.status, "published")).orderBy(desc(notebooks.updatedAt)).limit(100);
  return (
    <>
      <PageHeader title="نکته‌نامه‌ساز هوشمند" subtitle="از عکس، صدا یا متن، نکته‌نامه‌ای منظم و قابل ویرایش بساز." actions={<ActionButton url="/api/notebooks" label="نکته‌نامه جدید" icon="plus" className="btn btn-primary" redirectTo="/notebook/{id}" />} />
      <div className="mb-5 flex gap-2"><Link href="/notebook" className="chip" aria-pressed={tab === "mine"}>نکته‌نامه‌های من</Link><Link href="/notebook?tab=published" className="chip" aria-pressed={tab === "published"}>منتشرشده‌ها</Link></div>
      {rows.length === 0 ? <Empty title={tab === "mine" ? "هنوز نکته‌نامه‌ای نساخته‌ای" : "نکته‌نامه منتشرشده‌ای وجود ندارد"} text={tab === "mine" ? "با دکمه «نکته‌نامه جدید» شروع کن." : undefined} /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map(({ n, sub, owner }) => (
          <Link key={n.id} href={`/notebook/${n.id}`} className="glass card-hover fade-up block p-5">
            <div className="flex items-start gap-3"><span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-[var(--brand-soft)] text-brand"><NotebookPen size={21} /></span><div className="min-w-0"><h3 className="m-0 truncate font-extrabold">{n.title}</h3><div className="mt-1 text-xs text-muted">{sub ?? "بدون درس"}{tab === "published" && ` · ${owner.split(" ")[0]}`}</div></div></div>
            <div className="mt-3 flex items-center justify-between"><StatusBadge status={n.status} /><span className="text-xs text-faint">{formatJalali(n.updatedAt)}</span></div>
          </Link>
        ))}</div>
      )}
    </>
  );
}
