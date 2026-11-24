import { asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { subjects } from "@/db/schema";
import { handler, needPerm, readJson } from "@/lib/api";
import { getEntity, parseEntityInput, TABLES } from "@/lib/entity-server";
import { logAudit } from "@/lib/audit";
import { HttpError } from "@/lib/api";

type Ctx = { params: Promise<{ entity: string }> };

export const GET = handler<Ctx>(async (_req, ctx) => {
  const { entity } = await ctx.params;
  const meta = getEntity(entity);
  await needPerm(meta.perm);
  const t = TABLES[entity];
  const rows = await db.select().from(t).orderBy(desc(t.id)).limit(500);
  const subs = await db.select({ id: subjects.id, name: subjects.name }).from(subjects).orderBy(asc(subjects.sortOrder));
  return { rows, subjects: subs };
});

export const POST = handler<Ctx>(async (req, ctx) => {
  const { entity } = await ctx.params;
  const meta = getEntity(entity);
  const user = await needPerm(meta.perm);
  if (meta.canCreate === false) throw new HttpError(405, "ایجاد رکورد برای این بخش مجاز نیست.");
  const data = parseEntityInput(meta, await readJson(req), false);
  const t = TABLES[entity];
  if (entity === "library") data.publisherId = user.id;
  if (entity === "assignments" || entity === "contests") if ("createdBy" in t) data.createdBy = user.id;
  const [row] = (await db.insert(t).values(data).returning()) as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  await logAudit({ user, action: `${entity}.create`, entity, entityId: row.id });
  return { row };
});
