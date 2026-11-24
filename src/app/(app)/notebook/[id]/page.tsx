import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notebooks, subjects } from "@/db/schema";
import { hasPerm, requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { formatJalali } from "@/lib/jalali";
import { MarkdownView } from "@/components/MarkdownView";
import { NotebookWorkspace } from "@/components/NotebookWorkspace";
import { PageHeader } from "@/components/ui";
import { FileDown } from "lucide-react";

export const metadata = { title: "نکته‌نامه" };

export default async function NotebookPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user.permissions.length) notFound();
  await gate("notebook");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [nb] = await db.select().from(notebooks).where(eq(notebooks.id, id));
  if (!nb) notFound();
  const subs = await db.select({ id: subjects.id, name: subjects.name, teacher: subjects.teacher }).from(subjects).orderBy(asc(subjects.sortOrder));
  const owner = nb.userId === user.id;
  if (owner) {
    return (
      <>
        <PageHeader title={nb.title} subtitle="کارگاه ساخت نکته‌نامه" actions={<Link href="/notebook" className="btn">فهرست نکته‌نامه‌ها</Link>} />
        <NotebookWorkspace nb={{ id: nb.id, title: nb.title, subjectId: nb.subjectId, style: nb.style, sources: nb.sources, content: nb.content, status: nb.status, statusNote: nb.statusNote, hasDocx: !!nb.docxFileId }} subjects={subs} />
      </>
    );
  }
  if (nb.status !== "published" && !(hasPerm(user, "notebooks") && nb.status === "pending")) notFound();
  const sub = subs.find((s) => s.id === nb.subjectId);
  return (
    <>
      <PageHeader title={nb.title} subtitle={`${sub?.name ?? ""}${sub?.teacher ? ` · ${sub.teacher}` : ""} · ${formatJalali(nb.publishedAt ?? nb.updatedAt)}`} actions={<>{nb.docxFileId && <a className="btn btn-primary" href={`/api/files/${nb.docxFileId}?dl=1`}><FileDown size={17} />دانلود DOCX</a>}<Link href="/notebook?tab=published" className="btn">بازگشت</Link></>} />
      {nb.status === "pending" && <div className="badge badge-warn mb-4 !rounded-xl !px-3 !py-2">این نکته‌نامه در انتظار تأیید است.</div>}
      <div className="glass-solid mx-auto max-w-3xl p-6 md:p-8"><MarkdownView text={nb.content} /></div>
    </>
  );
}
