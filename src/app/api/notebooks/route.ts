import { z } from "zod";
import { db } from "@/db";
import { notebooks } from "@/db/schema";
import { handler, needFeature, needStaff, readJson } from "@/lib/api";

export const POST = handler(async (req) => {
  const user = await needStaff();
  await needFeature("notebook");
  const b = z.object({ title: z.string().trim().max(200).optional() }).parse(await readJson(req).catch(() => ({})));
  const [row] = await db.insert(notebooks).values({ userId: user.id, title: b.title || "نکته‌نامه بدون عنوان" }).returning({ id: notebooks.id });
  return { id: row.id };
});
