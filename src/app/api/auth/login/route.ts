import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clientIp, handler, HttpError, rateLimit, readJson } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { logAudit } from "@/lib/audit";

const schema = z.object({ email: z.string().trim().toLowerCase().email("ایمیل نامعتبر است."), password: z.string().min(1, "رمز عبور را وارد کنید.").max(200) });

export const POST = handler(async (req) => {
  const ip = clientIp(req);
  rateLimit(`login:${ip}`, 15, 10 * 60_000);
  await ensureSeed();
  const body = schema.parse(await readJson(req));
  rateLimit(`login-email:${body.email}`, 8, 10 * 60_000);
  const [u] = await db.select().from(users).where(eq(users.email, body.email));
  const ok = u ? await verifyPassword(body.password, u.passwordHash) : false;
  if (!u || !ok || !u.active) {
    await logAudit({ user: null, action: "auth.login.failed", entity: "users", result: "failed" });
    throw new HttpError(401, "ایمیل یا رمز عبور نادرست است.");
  }
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, u.id));
  await createSession(u.id);
  return { ok: true };
});
