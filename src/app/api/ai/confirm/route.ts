import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { aiConversations, aiMessages } from "@/db/schema";
import { handler, HttpError, needFeature, needPerm, readJson } from "@/lib/api";
import { hasPerm } from "@/lib/auth";
import { TOOLS } from "@/lib/ai-tools";
import { logAudit } from "@/lib/audit";

const body = z.object({ messageId: z.string().uuid(), callId: z.string().uuid(), approve: z.boolean() });

export const POST = handler(async (req) => {
  const user = await needPerm("ai");
  await needFeature("ai");
  const b = body.parse(await readJson(req));
  const [row] = await db.select({ m: aiMessages }).from(aiMessages).innerJoin(aiConversations, eq(aiConversations.id, aiMessages.conversationId)).where(and(eq(aiMessages.id, b.messageId), eq(aiConversations.userId, user.id)));
  if (!row) throw new HttpError(404, "پیام یافت نشد.");
  const list = row.m.pending ?? [];
  const idx = list.findIndex((p) => p.callId === b.callId);
  if (idx < 0) throw new HttpError(404, "عملیات یافت نشد.");
  const action = list[idx];
  if (action.state !== "pending") throw new HttpError(409, "این عملیات قبلاً پردازش شده است.");
  const tool = TOOLS.find((t) => t.name === action.tool);
  if (!tool || !hasPerm(user, tool.perm)) throw new HttpError(403, "برای اجرای این عملیات مجوز ندارید.");

  let next = { ...action };
  if (!b.approve) {
    next = { ...action, state: "rejected", result: "توسط مدیر رد شد." };
    await logAudit({ user, action: `ai.confirm.${action.tool}`, result: "denied", reason: "rejected" });
  } else {
    try {
      const args = tool.schema.parse(action.args);
      const result = await tool.run(args as never, user);
      next = { ...action, state: "done", result };
      await logAudit({ user, action: `ai.confirm.${action.tool}`, reason: result.slice(0, 200) });
    } catch (e) {
      next = { ...action, state: "failed", result: e instanceof Error ? e.message.slice(0, 200) : "اجرا ناموفق بود." };
      await logAudit({ user, action: `ai.confirm.${action.tool}`, result: "failed" });
    }
  }
  const updated = list.map((p, i) => (i === idx ? next : p));
  await db.update(aiMessages).set({ pending: updated }).where(eq(aiMessages.id, b.messageId));
  return { action: next };
});
