import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notebooks, subjects } from "@/db/schema";
import { handler, HttpError, needFeature, needStaff, readJson } from "@/lib/api";
import { hasPerm } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { sendToBale } from "@/lib/bale";

const schema = z.object({ action: z.enum(["request", "approve", "reject", "withdraw"]), bale: z.boolean().optional(), note: z.string().max(300).optional() });

export const POST = handler<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await needStaff();
  await needFeature("notebook");
  const id = Number((await ctx.params).id);
  const b = schema.parse(await readJson(req));
  const [nb] = await db.select().from(notebooks).where(eq(notebooks.id, id));
  if (!nb) throw new HttpError(404, "نکته‌نامه یافت نشد.");

  if (b.action === "request" || b.action === "withdraw") {
    if (nb.userId !== user.id) throw new HttpError(403, "دسترسی ندارید.");
    if (b.action === "request") {
      if (!nb.content.trim()) throw new HttpError(400, "ابتدا متن نکته‌نامه را تکمیل کنید.");
      if (nb.status === "pending" || nb.status === "published") throw new HttpError(409, "درخواست انتشار قبلاً ثبت شده است.");
      await db.update(notebooks).set({ status: "pending", statusNote: null }).where(and(eq(notebooks.id, id), eq(notebooks.userId, user.id)));
    } else {
      if (nb.status !== "pending") throw new HttpError(409, "فقط درخواست در انتظار قابل بازپس‌گیری است.");
      await db.update(notebooks).set({ status: "draft" }).where(eq(notebooks.id, id));
    }
    await logAudit({ user, action: `notebooks.${b.action}`, entity: "notebooks", entityId: id });
    return { ok: true };
  }

  if (!hasPerm(user, "notebooks")) throw new HttpError(403, "دسترسی ندارید.");
  if (nb.status !== "pending") throw new HttpError(409, "این مورد در انتظار تأیید نیست (از انتشار تکراری جلوگیری شد).");
  if (b.action === "reject") {
    await db.update(notebooks).set({ status: "failed", statusNote: b.note ?? "رد شد" }).where(and(eq(notebooks.id, id), eq(notebooks.status, "pending")));
    await logAudit({ user, action: "notebooks.reject", entity: "notebooks", entityId: id, reason: b.note });
    return { ok: true };
  }
  const moved = await db.update(notebooks).set({ status: "published", publishedAt: new Date(), statusNote: null }).where(and(eq(notebooks.id, id), eq(notebooks.status, "pending"))).returning({ id: notebooks.id });
  if (!moved.length) throw new HttpError(409, "انتشار تکراری.");
  let baleMsg: string | undefined;
  if (b.bale && !nb.baleSentAt) {
    const [sub] = nb.subjectId ? await db.select().from(subjects).where(eq(subjects.id, nb.subjectId)) : [];
    const r = await sendToBale(`📘 نکته‌نامه جدید: ${nb.title}${sub ? `\nدرس: ${sub.name}` : ""}\n\n${nb.content.slice(0, 800)}${nb.content.length > 800 ? "…" : ""}`);
    if (r.ok) await db.update(notebooks).set({ baleSentAt: new Date() }).where(eq(notebooks.id, id));
    else await db.update(notebooks).set({ statusNote: `ارسال به بله ناموفق: ${r.error}` }).where(eq(notebooks.id, id));
    baleMsg = r.ok ? "به بله ارسال شد." : `ارسال به بله ناموفق: ${r.error}`;
  }
  await logAudit({ user, action: "notebooks.approve", entity: "notebooks", entityId: id, reason: baleMsg });
  return { ok: true, message: baleMsg };
});
