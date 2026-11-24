import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { handler, needFeature, needUser, readJson } from "@/lib/api";
import { checkBadges } from "@/lib/points";

const noteSchema = z.object({
  title: z.string().trim().min(1, "عنوان را وارد کنید.").max(120),
  body: z.string().trim().min(1, "متن یادداشت را وارد کنید.").max(5000),
  noteDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, "تاریخ نامعتبر است."),
  subjectId: z.number().int().positive().nullable().optional(),
  color: z.enum(["yellow", "blue", "green", "pink"]).default("yellow"),
});

export const GET = handler(async () => {
  const user = await needUser();
  await needFeature("notes");
  return { rows: await db.select().from(notes).where(eq(notes.userId, user.id)).orderBy(desc(notes.createdAt)) };
});

export const POST = handler(async (req) => {
  const user = await needUser();
  await needFeature("notes");
  const b = noteSchema.parse(await readJson(req));
  const [row] = await db.insert(notes).values({ ...b, subjectId: b.subjectId ?? null, userId: user.id }).returning();
  await checkBadges(user.id);
  return { row };
});

export const DELETE = handler(async (req) => {
  const user = await needUser();
  const id = Number(new URL(req.url).searchParams.get("id"));
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id)));
  return { ok: true };
});
