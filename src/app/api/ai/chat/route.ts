import { and, asc, eq, gte } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/db";
import { aiConversations, aiMessages, type PendingAction } from "@/db/schema";
import { handler, HttpError, needFeature, needPerm, rateLimit, readJson } from "@/lib/api";
import { aiConfigured, chatCompletion } from "@/lib/ai";
import { toolsFor, toOpenAiTools } from "@/lib/ai-tools";
import { logAudit } from "@/lib/audit";

export const maxDuration = 60;

const body = z.object({ conversationId: z.string().uuid().optional(), message: z.string().trim().min(1, "پیام خالی است.").max(6000), editMessageId: z.string().uuid().optional() });

const SYSTEM = `تو «ChatGPT - نمره‌ساز»، دستیار مدیریتی پلتفرم آموزشی نمره‌ساز (پایه نهم) هستی و فقط با مالک و مدیران صحبت می‌کنی. فارسی، روشن و کوتاه پاسخ بده.
قواعد:
- فقط از ابزارهای ارائه‌شده برای خواندن داده یا انجام کار استفاده کن؛ به دیتابیس و اسرار دسترسی مستقیم نداری.
- برای اقدام‌های حساس (ویرایش درس، انتشار عمومی، تغییر قابلیت‌ها) ابزار را فراخوانی کن تا کارت تأیید برای مدیر نمایش داده شود، و در پاسخ برنامه تغییر را شرح بده. هرگز نگو انجام شد مگر نتیجه ابزار موفق باشد.
- اگر درخواست مبهم است ابتدا بپرس.
- آمار را فقط از ابزار بگیر؛ عدد نساز.
- صفحه، آزمون و اطلاعیه را فقط به‌صورت پیش‌نویس بساز؛ انتشار نیازمند تأیید است. HTML یا کد دلخواه تولید نکن.
- حذف داده، تغییر نقش کاربران و تغییر رمز از توانایی‌های تو نیست.`;

export const POST = handler(async (req) => {
  const user = await needPerm("ai");
  await needFeature("ai");
  rateLimit(`ai:${user.id}`, 40, 10 * 60_000);
  if (!aiConfigured()) throw new HttpError(503, "دستیار پیکربندی نشده است. متغیر محیطی OPENAI_API_KEY را در سرور تنظیم کنید.");
  const b = body.parse(await readJson(req));

  let convId = b.conversationId;
  if (convId) {
    const [c] = await db.select().from(aiConversations).where(and(eq(aiConversations.id, convId), eq(aiConversations.userId, user.id)));
    if (!c) throw new HttpError(404, "گفت‌وگو یافت نشد.");
  } else {
    const [c] = await db.insert(aiConversations).values({ userId: user.id, title: b.message.slice(0, 50) }).returning({ id: aiConversations.id });
    convId = c.id;
  }
  if (b.editMessageId) {
    const [m] = await db.select().from(aiMessages).where(and(eq(aiMessages.id, b.editMessageId), eq(aiMessages.conversationId, convId)));
    if (m && m.role === "user") await db.delete(aiMessages).where(and(eq(aiMessages.conversationId, convId), gte(aiMessages.createdAt, m.createdAt)));
  }
  await db.insert(aiMessages).values({ conversationId: convId, role: "user", content: b.message });

  const history = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, convId)).orderBy(asc(aiMessages.createdAt));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgs: any[] = [{ role: "system", content: SYSTEM }, ...history.slice(-20).map((m) => ({ role: m.role, content: m.content }))];
  const allowed = toolsFor(user);
  const tools = toOpenAiTools(user);
  const executed: { name: string; ok: boolean; summary: string }[] = [];
  const pending: PendingAction[] = [];
  let reply = "";

  for (let i = 0; i < 5; i++) {
    const r = await chatCompletion({ messages: msgs, tools: tools.length ? tools : undefined, temperature: 0.3 });
    const m = r.choices[0]?.message;
    if (!m) break;
    if (!m.tool_calls?.length) { reply = m.content ?? ""; break; }
    msgs.push({ role: "assistant", content: m.content ?? "", tool_calls: m.tool_calls.map((t) => ({ id: t.id, type: "function", function: t.function })) });
    for (const call of m.tool_calls) {
      const tool = allowed.find((t) => t.name === call.function.name);
      let result: string;
      if (!tool) {
        result = "خطا: این ابزار وجود ندارد یا مجوز آن را ندارید.";
        await logAudit({ user, action: `ai.tool.${call.function.name}`, result: "denied" });
      } else {
        try {
          const args = tool.schema.parse(JSON.parse(call.function.arguments || "{}"));
          if (tool.sensitive) {
            pending.push({ callId: randomUUID(), tool: tool.name, args: args as Record<string, unknown>, summary: tool.summarize(args as never), state: "pending" });
            result = "این عملیات حساس است و در انتظار تأیید صریح مدیر قرار گرفت؛ هنوز اجرا نشده است.";
          } else {
            result = await tool.run(args as never, user);
            executed.push({ name: tool.name, ok: true, summary: tool.summarize(args as never) });
            await logAudit({ user, action: `ai.tool.${tool.name}`, reason: result.slice(0, 200) });
          }
        } catch (e) {
          result = `خطا در اجرا: ${e instanceof Error ? e.message.slice(0, 200) : "نامشخص"}`;
          executed.push({ name: call.function.name, ok: false, summary: result });
          await logAudit({ user, action: `ai.tool.${call.function.name}`, result: "failed" });
        }
      }
      msgs.push({ role: "tool", tool_call_id: call.id, content: result });
    }
  }
  if (!reply) reply = pending.length ? "برنامه عملیات بالا آماده است؛ لطفاً تأیید یا رد کنید." : "پاسخی دریافت نشد؛ دوباره تلاش کنید.";
  const [saved] = await db.insert(aiMessages).values({ conversationId: convId, role: "assistant", content: reply, tools: executed.length ? executed : null, pending: pending.length ? pending : null }).returning();
  await db.update(aiConversations).set({ updatedAt: new Date() }).where(eq(aiConversations.id, convId));
  return { conversationId: convId, message: saved };
});
