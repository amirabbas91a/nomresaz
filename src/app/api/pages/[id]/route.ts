import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { handler, HttpError, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { blockSchema } from "@/lib/pages";

type Ctx = { params: Promise<{ id: string }> };
const schema = z.object({ title: z.string().trim().min(2).max(200), blocks: z.array(blockSchema).max(40), status: z.enum(["draft", "published"]), confirmPublish: z.boolean().optional() });

export const PUT = handler<Ctx>(async (req, ctx) => {
  const user = await needPerm("appearance");
  const id = Number((await ctx.params).id);
  const b = schema.parse(await readJson(req));
  const [cur] = await db.select().from(pages).where(eq(pages.id, id));
  if (!cur) throw new HttpError(404, "صفحه یافت نشد.");
  if (b.status === "published" && cur.status !== "published" && !b.confirmPublish) throw new HttpError(400, "انتشار نیازمند تأیید صریح است.");
  await db.update(pages).set({ title: b.title, blocks: b.blocks.map((x) => ({ ...x })), status: b.status }).where(eq(pages.id, id));
  await logAudit({ user, action: "pages.update", entity: "pages", entityId: id, reason: `status=${b.status}` });
  return { ok: true };
});

export const DELETE = handler<Ctx>(async (_r, ctx) => {
  const user = await needPerm("appearance");
  const id = Number((await ctx.params).id);
  await db.delete(pages).where(eq(pages.id, id));
  await logAudit({ user, action: "pages.delete", entity: "pages", entityId: id });
  return { ok: true };
});
