import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { surveyResponses, surveys } from "@/db/schema";
import { handler, HttpError, needFeature, needUser, readJson } from "@/lib/api";

export const POST = handler<{ params: Promise<{ id: string }> }>(async (req, ctx) => {
  const user = await needUser();
  await needFeature("surveys");
  const id = Number((await ctx.params).id);
  const { answers } = z.object({ answers: z.record(z.string().max(30), z.unknown()) }).parse(await readJson(req));
  const [s] = await db.select().from(surveys).where(eq(surveys.id, id));
  if (!s || s.status !== "published") throw new HttpError(404, "نظرسنجی یافت نشد.");
  const now = new Date();
  if ((s.startsAt && s.startsAt > now) || (s.endsAt && s.endsAt < now)) throw new HttpError(403, "نظرسنجی در حال حاضر باز نیست.");
  const clean: Record<string, unknown> = {};
  for (const q of s.questions) {
    const v = answers[q.id];
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) { if (q.required) throw new HttpError(400, `پاسخ به «${q.text}» الزامی است.`); continue; }
    if (q.type === "text") clean[q.id] = String(v).slice(0, 2000);
    else if (q.type === "scale") { const n = Number(v); if (!(n >= 1 && n <= 5)) throw new HttpError(400, "مقدار مقیاس نامعتبر است."); clean[q.id] = n; }
    else if (q.type === "single") { const n = Number(v); if (!Number.isInteger(n) || n < 0 || n >= (q.options?.length ?? 0)) throw new HttpError(400, "گزینه نامعتبر است."); clean[q.id] = n; }
    else if (q.type === "multi") { const arr = (Array.isArray(v) ? v : []).map(Number); if (arr.some((n) => !Number.isInteger(n) || n < 0 || n >= (q.options?.length ?? 0))) throw new HttpError(400, "گزینه نامعتبر است."); clean[q.id] = [...new Set(arr)]; }
  }
  // Duplicate protection keyed by a salted hash so anonymous surveys never store the user id.
  const respondentKey = createHash("sha256").update(`${user.id}:${id}:${process.env.SURVEY_SALT ?? "nomresaz"}`).digest("hex");
  const res = await db.insert(surveyResponses).values({ surveyId: id, respondentKey, userId: s.anonymous ? null : user.id, answers: clean }).onConflictDoNothing().returning({ id: surveyResponses.id });
  if (res.length === 0) throw new HttpError(409, "شما قبلاً به این نظرسنجی پاسخ داده‌اید.");
  return { ok: true };
});
