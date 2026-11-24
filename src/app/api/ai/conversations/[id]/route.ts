import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { handler, HttpError, needPerm, readJson } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };
const own = async (id: string, userId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, "یافت نشد.");
  const [c] = await db.select().from(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)));
  if (!c) throw new HttpError(404, "گفت‌وگو یافت نشد.");
  return c;
};

export const GET = handler<Ctx>(async (_r, ctx) => {
  const user = await needPerm("ai");
  const c = await own((await ctx.params).id, user.id);
  return { conversation: c, messages: await db.select().from(aiMessages).where(eq(aiMessages.conversationId, c.id)).orderBy(asc(aiMessages.createdAt)) };
});

export const PATCH = handler<Ctx>(async (req, ctx) => {
  const user = await needPerm("ai");
  const c = await own((await ctx.params).id, user.id);
  const { title } = z.object({ title: z.string().trim().min(1).max(100) }).parse(await readJson(req));
  await db.update(aiConversations).set({ title }).where(eq(aiConversations.id, c.id));
  return { ok: true };
});

export const DELETE = handler<Ctx>(async (_r, ctx) => {
  const user = await needPerm("ai");
  const c = await own((await ctx.params).id, user.id);
  await db.delete(aiConversations).where(eq(aiConversations.id, c.id));
  return { ok: true };
});
