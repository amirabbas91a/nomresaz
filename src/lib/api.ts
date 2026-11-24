import "server-only";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { features } from "@/db/schema";
import { getCurrentUser, hasPerm, type SessionUser } from "./auth";
import { logAudit } from "./audit";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const buckets = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number) {
  const t = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < t) {
    buckets.set(key, { n: 1, reset: t + windowMs });
    return;
  }
  b.n += 1;
  if (b.n > limit) throw new HttpError(429, "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.");
}

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function checkOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (new URL(origin).host !== host) throw new HttpError(403, "درخواست از مبدأ نامعتبر.");
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(403, "درخواست نامعتبر.");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handler<C = any>(fn: (req: Request, ctx: C) => Promise<unknown>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      checkOrigin(req);
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return Response.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError) {
        return Response.json({ error: e.issues[0]?.message ?? "ورودی نامعتبر است." }, { status: 400 });
      }
      console.error("API error:", e instanceof Error ? e.message : e);
      return Response.json({ error: "خطای داخلی سرور. دوباره تلاش کنید." }, { status: 500 });
    }
  };
}

export async function needUser(): Promise<SessionUser> {
  const u = await getCurrentUser();
  if (!u) throw new HttpError(401, "ابتدا وارد حساب کاربری شوید.");
  return u;
}

export async function needStaff(): Promise<SessionUser> {
  const u = await needUser();
  if (!u.permissions.length) throw new HttpError(403, "این بخش فقط برای مسئولان سایت فعال است.");
  return u;
}

export async function needPerm(perm: string): Promise<SessionUser> {
  const u = await needUser();
  if (!hasPerm(u, perm)) {
    await logAudit({ user: u, action: "access.denied", entity: perm, result: "denied" });
    throw new HttpError(403, "دسترسی کافی ندارید.");
  }
  return u;
}

export async function isFeatureOn(key: string) {
  const [f] = await db.select().from(features).where(eq(features.key, key));
  return f ? f.enabled : true;
}

export async function needFeature(key: string) {
  if (!(await isFeatureOn(key))) throw new HttpError(403, "این قابلیت غیرفعال است.");
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "بدنه درخواست نامعتبر است.");
  }
}
