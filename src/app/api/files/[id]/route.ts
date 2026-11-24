import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { assignments, files, notebooks, resources } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { HttpError, handler } from "@/lib/api";
import { getTelegramFileStream } from "@/lib/telegram";

type Ctx = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export const GET = handler<Ctx>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "یافت نشد.");
  const [f] = await db.select().from(files).where(eq(files.id, id));
  if (!f) throw new HttpError(404, "یافت نشد.");

  if (!f.isPublic) {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, "برای دسترسی وارد شوید.");
    let allowed = user.permissions.length > 0 || f.ownerId === user.id;
    if (!allowed) {
      const [r] = await db.select({ id: resources.id }).from(resources).where(and(eq(resources.fileId, id), eq(resources.status, "published"))).limit(1);
      const [a] = await db.select({ id: assignments.id }).from(assignments).where(and(eq(assignments.fileId, id), eq(assignments.status, "active"))).limit(1);
      const [n] = await db.select({ id: notebooks.id }).from(notebooks).where(and(eq(notebooks.docxFileId, id), eq(notebooks.status, "published"))).limit(1);
      allowed = !!(r || a || n);
    }
    if (!allowed) throw new HttpError(403, "دسترسی به این فایل مجاز نیست.");
  }

  const url = new URL(req.url);
  const download = url.searchParams.get("dl") === "1";
  if (download) {
    await db.update(resources).set({ downloads: sql`${resources.downloads} + 1` }).where(or(eq(resources.fileId, id)));
  }
  const inline = !download && (f.mime.startsWith("image/") || f.mime === "application/pdf" || f.mime.startsWith("audio/"));

  const headers = {
    "Content-Type": f.mime,
    "Content-Length": String(f.size),
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(f.name)}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": f.isPublic ? "public, max-age=3600" : "private, max-age=0",
  };

  if (f.telegramFileId) {
    try {
      const tgRes = await getTelegramFileStream(f.telegramFileId);
      return new Response(tgRes.body, { headers });
    } catch (err) {
      console.error("Failed to stream from Telegram:", err);
      if (!f.data) {
        throw new HttpError(500, "خطا در دریافت فایل از تلگرام.");
      }
    }
  }

  if (!f.data) {
    throw new HttpError(404, "محتوای فایل موجود نیست.");
  }

  return new Response(new Uint8Array(f.data), { headers });
});
