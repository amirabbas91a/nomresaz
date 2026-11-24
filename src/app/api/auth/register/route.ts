import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { clientIp, handler, HttpError, rateLimit, readJson } from "@/lib/api";
import { createSession, hashPassword, passwordProblem } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2, "نام را وارد کنید.").max(60),
  email: z.string().trim().toLowerCase().email("ایمیل نامعتبر است."),
  password: z.string().max(200),
});

export const POST = handler(async (req) => {
  rateLimit(`reg:${clientIp(req)}`, 8, 10 * 60_000);
  await ensureSeed();
  const body = schema.parse(await readJson(req));
  const problem = passwordProblem(body.password);
  if (problem) throw new HttpError(400, problem);
  const [exists] = await db.select({ id: users.id }).from(users).where(eq(users.email, body.email));
  if (exists) throw new HttpError(409, "این ایمیل قبلاً ثبت شده است.");

  // The first account becomes the owner. If OWNER_EMAIL is set, only that email may become owner.
  const [{ n }] = await db.select({ n: count() }).from(users);
  const ownerEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const isOwner = ownerEmail ? body.email === ownerEmail : n === 0;

  const [u] = await db
    .insert(users)
    .values({ name: body.name, email: body.email, passwordHash: await hashPassword(body.password), roleKey: isOwner ? "owner" : "student" })
    .returning({ id: users.id, name: users.name });
  await createSession(u.id);
  await logAudit({ user: u, action: isOwner ? "user.register.owner" : "user.register", entity: "users", entityId: u.id });
  return { ok: true };
});
