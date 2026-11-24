import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { contestEntries, contests } from "@/db/schema";
import { handler, HttpError, needFeature, needUser, readJson } from "@/lib/api";
import { awardPoints, checkBadges } from "@/lib/points";

export const POST = handler<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await needUser();
  await needFeature("contests");
  const id = Number((await ctx.params).id);
  const { answer } = z.object({ answer: z.string().max(3000).optional() }).parse(await readJson(req));
  const [c] = await db.select().from(contests).where(eq(contests.id, id));
  const now = new Date();
  if (!c || c.status !== "published") throw new HttpError(404, "مسابقه یافت نشد.");
  if ((c.startsAt && c.startsAt > now) || (c.endsAt && c.endsAt < now)) throw new HttpError(403, "مسابقه در حال حاضر باز نیست.");
  const res = await db.insert(contestEntries).values({ contestId: id, userId: user.id, answer: answer ?? null }).onConflictDoNothing().returning({ u: contestEntries.userId });
  if (res.length === 0) throw new HttpError(409, "قبلاً در این مسابقه شرکت کرده‌اید.");
  if (c.points > 0) await awardPoints({ userId: user.id, kind: "contest", refId: id, points: c.points, reason: `مسابقه «${c.title}»` });
  await checkBadges(user.id);
  return { ok: true };
});
