import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { handler, HttpError, needUser, readJson } from "@/lib/api";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  leaderboardVisible: z.boolean().optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: z.string().max(200).optional(),
});

export const PATCH = handler(async (req) => {
  const user = await needUser();
  const b = schema.parse(await readJson(req));
  const set: Partial<typeof users.$inferInsert> = {};
  if (b.name) set.name = b.name;
  if (b.leaderboardVisible !== undefined) set.leaderboardVisible = b.leaderboardVisible;
  if (b.newPassword) {
    const problem = passwordProblem(b.newPassword);
    if (problem) throw new HttpError(400, problem);
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    if (!b.currentPassword || !(await verifyPassword(b.currentPassword, row.passwordHash))) throw new HttpError(403, "رمز فعلی نادرست است.");
    set.passwordHash = await hashPassword(b.newPassword);
    await logAudit({ user, action: "user.password.change", entity: "users", entityId: user.id });
  }
  if (Object.keys(set).length) await db.update(users).set(set).where(eq(users.id, user.id));
  return { ok: true };
});
