import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { files, notebooks } from "@/db/schema";
import { handler, HttpError, needFeature, needStaff, readJson } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({
  title: z.string().trim().min(1, "عنوان را وارد کنید.").max(200),
  subjectId: z.number().int().positive().nullable().optional(),
  style: z.enum(["full", "summary", "exam", "custom"]),
  content: z.string().max(200_000),
  sources: z.array(z.object({ id: z.string().max(30), type: z.enum(["text", "image", "audio"]), name: z.string().max(200), text: z.string().max(100_000), uncertain: z.boolean().optional() })).max(60),
});

export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await needStaff();
  await needFeature("notebook");
  const id = Number((await ctx.params).id);
  const b = schema.parse(await readJson(req));
  const [cur] = await db.select().from(notebooks).where(and(eq(notebooks.id, id), eq(notebooks.userId, user.id)));
  if (!cur) throw new HttpError(404, "نکته‌نامه یافت نشد.");
  if (cur.status === "pending" || cur.status === "published") throw new HttpError(409, "نکته‌نامه در انتظار تأیید یا منتشرشده قابل ویرایش نیست.");
  await db.update(notebooks).set({ ...b, subjectId: b.subjectId ?? null, updatedAt: new Date() }).where(eq(notebooks.id, id));
  return { ok: true, savedAt: new Date().toISOString() };
});

export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const user = await needStaff();
  const id = Number((await ctx.params).id);
  const [row] = await db.delete(notebooks).where(and(eq(notebooks.id, id), eq(notebooks.userId, user.id))).returning({ f: notebooks.docxFileId });
  if (row?.f) await db.delete(files).where(eq(files.id, row.f));
  return { ok: true };
});
