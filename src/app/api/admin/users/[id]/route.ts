import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { roles, sessions, users } from "@/db/schema";
import { handler, HttpError, needPerm, rateLimit, readJson } from "@/lib/api";
import { verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({ roleKey: z.string().max(60).optional(), active: z.boolean().optional(), password: z.string().min(1, "برای تأیید، رمز عبور خود را وارد کنید.").max(200) });

export const PATCH = handler<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const admin = await needPerm("users");
  rateLimit(`usr:${admin.id}`, 20, 10 * 60_000);
  const id = (await ctx.params).id;
  const b = schema.parse(await readJson(req));
  // Re-authentication for sensitive operation
  const [me] = await db.select().from(users).where(eq(users.id, admin.id));
  if (!(await verifyPassword(b.password, me.passwordHash))) {
    await logAudit({ user: admin, action: "users.update", entity: "users", entityId: id, result: "denied", reason: "re-auth failed" });
    throw new HttpError(403, "رمز عبور نادرست است.");
  }
  if (id === admin.id) throw new HttpError(400, "تغییر نقش یا وضعیت حساب خودتان مجاز نیست.");
  const [target] = await db.select().from(users).where(eq(users.id, id));
  if (!target) throw new HttpError(404, "کاربر یافت نشد.");
  if ((target.roleKey === "owner" || b.roleKey === "owner") && !admin.isOwner) throw new HttpError(403, "فقط مالک می‌تواند نقش مالک را تغییر دهد.");
  if (b.roleKey) {
    const [r] = await db.select().from(roles).where(eq(roles.key, b.roleKey));
    if (!r) throw new HttpError(400, "نقش نامعتبر است.");
  }
  if (target.roleKey === "owner" && (b.roleKey && b.roleKey !== "owner" || b.active === false)) {
    const [{ n }] = await db.select({ n: count() }).from(users).where(and(eq(users.roleKey, "owner"), eq(users.active, true)));
    if (n <= 1) throw new HttpError(400, "حداقل یک مالک فعال باید باقی بماند.");
  }
  const set: Partial<typeof users.$inferInsert> = {};
  if (b.roleKey) set.roleKey = b.roleKey;
  if (b.active !== undefined) set.active = b.active;
  await db.update(users).set(set).where(eq(users.id, id));
  if (b.active === false) await db.delete(sessions).where(eq(sessions.userId, id)); // revoke access immediately
  await logAudit({ user: admin, action: b.roleKey ? "users.role.change" : "users.active.change", entity: "users", entityId: id, reason: JSON.stringify({ from: target.roleKey, to: b.roleKey, active: b.active }) });
  return { ok: true };
});
