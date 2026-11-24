import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { handler, HttpError, needUser, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { ALL_PERMS } from "@/lib/permissions";

async function owner() {
  const u = await needUser();
  if (!u.isOwner) throw new HttpError(403, "فقط مالک اصلی می‌تواند نقش‌ها را مدیریت کند.");
  return u;
}
const perms = z.array(z.string()).transform((a) => a.filter((p) => ALL_PERMS.includes(p)));

export const POST = handler(async (req) => {
  const u = await owner();
  const b = z.object({ name: z.string().trim().min(2).max(50), permissions: perms }).parse(await readJson(req));
  const key = `r_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(roles).values({ key, name: b.name, permissions: b.permissions });
  await logAudit({ user: u, action: "roles.create", entity: "roles", entityId: key });
  return { key };
});

export const PUT = handler(async (req) => {
  const u = await owner();
  const b = z.object({ key: z.string(), name: z.string().trim().min(2).max(50).optional(), permissions: perms }).parse(await readJson(req));
  if (b.key === "owner") throw new HttpError(400, "نقش مالک قابل ویرایش نیست.");
  await db.update(roles).set({ permissions: b.permissions, ...(b.name ? { name: b.name } : {}) }).where(eq(roles.key, b.key));
  await logAudit({ user: u, action: "roles.permissions.change", entity: "roles", entityId: b.key, reason: b.permissions.join(",") });
  return { ok: true };
});

export const DELETE = handler(async (req) => {
  const u = await owner();
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const [r] = await db.select().from(roles).where(eq(roles.key, key));
  if (!r || r.isSystem) throw new HttpError(400, "نقش سیستمی قابل حذف نیست.");
  const used = await db.select({ id: users.id }).from(users).where(eq(users.roleKey, key)).limit(1);
  if (used.length) throw new HttpError(409, "این نقش به کاربرانی اختصاص دارد.");
  await db.delete(roles).where(eq(roles.key, key));
  await logAudit({ user: u, action: "roles.delete", entity: "roles", entityId: key });
  return { ok: true };
});
