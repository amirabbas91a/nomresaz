import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { handler, HttpError, needPerm, readJson } from "@/lib/api";
import { getEntity, parseEntityInput, TABLES } from "@/lib/entity-server";
import { logAudit } from "@/lib/audit";

type Ctx = { params: Promise<{ entity: string; id: string }> };

function numId(id: string) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, "شناسه نامعتبر است.");
  return n;
}

export const PATCH = handler<Ctx>(async (req, ctx) => {
  const { entity, id } = await ctx.params;
  const meta = getEntity(entity);
  const user = await needPerm(meta.perm);
  const t = TABLES[entity];
  const data = parseEntityInput(meta, await readJson(req), true);
  const [row] = (await db.update(t).set(data).where(eq(t.id, numId(id))).returning()) as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!row) throw new HttpError(404, "رکورد یافت نشد.");
  await logAudit({ user, action: `${entity}.update`, entity, entityId: id });
  return { row };
});

export const DELETE = handler<Ctx>(async (_req, ctx) => {
  const { entity, id } = await ctx.params;
  const meta = getEntity(entity);
  const user = await needPerm(meta.perm);
  const t = TABLES[entity];
  const [row] = (await db.delete(t).where(eq(t.id, numId(id))).returning()) as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!row) throw new HttpError(404, "رکورد یافت نشد.");
  if (row.fileId) await db.delete(files).where(eq(files.id, row.fileId));
  await logAudit({ user, action: `${entity}.delete`, entity, entityId: id });
  return { ok: true };
});
