import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assignmentDone } from "@/db/schema";
import { handler, HttpError, needFeature, needUser, readJson } from "@/lib/api";
import { checkBadges } from "@/lib/points";

export const POST = handler<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await needUser();
  await needFeature("assignments");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new HttpError(400, "شناسه نامعتبر");
  const { done } = z.object({ done: z.boolean() }).parse(await readJson(req));
  if (done) {
    await db.insert(assignmentDone).values({ userId: user.id, assignmentId: id }).onConflictDoNothing();
    await checkBadges(user.id);
  } else {
    await db.delete(assignmentDone).where(and(eq(assignmentDone.userId, user.id), eq(assignmentDone.assignmentId, id)));
  }
  return { ok: true };
});
