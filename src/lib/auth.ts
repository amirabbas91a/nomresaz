import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { roles, sessions, users } from "@/db/schema";
import { ALL_PERMS } from "./permissions";
import { ensureSeed } from "./seed";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
export const SESSION_COOKIE = "nm_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, saltHex, keyHex] = stored.split("$");
  if (alg !== "scrypt" || !saltHex || !keyHex) return false;
  const key = await scrypt(password, Buffer.from(saltHex, "hex"), 64);
  const expected = Buffer.from(keyHex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({ userId, tokenHash: sha(token), expiresAt });
  const h = await headers();
  const secure = h.get("x-forwarded-proto") === "https";
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, sha(token)));
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  grade: string;
  leaderboardVisible: boolean;
  isOwner: boolean;
  permissions: string[];
};

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  await ensureSeed();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ u: users, roleName: roles.name, perms: roles.permissions })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(roles, eq(roles.key, users.roleKey))
    .where(and(eq(sessions.tokenHash, sha(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.u.active) return null;
  const isOwner = row.u.roleKey === "owner";
  return {
    id: row.u.id,
    name: row.u.name,
    email: row.u.email,
    roleKey: row.u.roleKey,
    roleName: row.roleName ?? row.u.roleKey,
    grade: row.u.grade,
    leaderboardVisible: row.u.leaderboardVisible,
    isOwner,
    permissions: isOwner ? ALL_PERMS : (row.perms ?? []),
  };
});

export function hasPerm(user: SessionUser | null, perm: string) {
  return !!user && (user.isOwner || user.permissions.includes(perm));
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdminPage(perm?: string) {
  const user = await requireUser();
  if (user.permissions.length === 0) redirect("/dashboard");
  if (perm && !hasPerm(user, perm)) redirect("/admin?denied=1");
  return user;
}

export function passwordProblem(pw: string) {
  if (pw.length < 8) return "رمز عبور باید حداقل ۸ نویسه باشد.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "رمز عبور باید ترکیبی از حرف و عدد باشد.";
  return null;
}
