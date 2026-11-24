import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files, notebooks, subjects } from "@/db/schema";
import { handler, HttpError, needFeature, needStaff, rateLimit } from "@/lib/api";
import { buildNotebookDocx } from "@/lib/docx";
import { formatJalali } from "@/lib/jalali";
import { getSite } from "@/lib/settings";

const STYLES: Record<string, string> = { full: "کامل", summary: "خلاصه", exam: "مرور امتحانی", custom: "دلخواه" };

export const POST = handler<{ params: Promise<{ id: string }> }>(async (_req, ctx) => {
  const user = await needStaff();
  await needFeature("notebook");
  rateLimit(`docx:${user.id}`, 20, 10 * 60_000);
  const id = Number((await ctx.params).id);
  const [nb] = await db.select().from(notebooks).where(and(eq(notebooks.id, id), eq(notebooks.userId, user.id)));
  if (!nb) throw new HttpError(404, "نکته‌نامه یافت نشد.");
  if (!nb.content.trim()) throw new HttpError(400, "متن نکته‌نامه خالی است.");
  const [sub] = nb.subjectId ? await db.select().from(subjects).where(eq(subjects.id, nb.subjectId)) : [];
  const site = await getSite();
  const buf = await buildNotebookDocx({ siteName: site.siteName, title: nb.title, subject: sub?.name ?? "", teacher: sub?.teacher ?? "", dateText: formatJalali(new Date()), styleLabel: STYLES[nb.style] ?? "", content: nb.content });
  const old = nb.docxFileId;
  const [f] = await db.insert(files).values({
    name: `${nb.title.slice(0, 80)}.docx`, mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: buf.length, data: buf, ownerId: user.id, isPublic: false,
  }).returning({ id: files.id });
  await db.update(notebooks).set({ docxFileId: f.id }).where(eq(notebooks.id, id));
  if (old) await db.delete(files).where(eq(files.id, old));
  return { url: `/api/files/${f.id}?dl=1` };
});
