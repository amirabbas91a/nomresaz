import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notebooks } from "@/db/schema";
import { handler, HttpError, needStaff } from "@/lib/api";

export const GET = handler<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await needStaff();
  const id = Number((await ctx.params).id);
  const [nb] = await db.select().from(notebooks).where(and(eq(notebooks.id, id), eq(notebooks.userId, user.id)));
  if (!nb?.docxFileId) throw new HttpError(404, "فایلی ساخته نشده است.");
  return Response.redirect(new URL(`/api/files/${nb.docxFileId}?dl=1`, req.url), 302);
});
