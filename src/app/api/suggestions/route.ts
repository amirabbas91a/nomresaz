import { z } from "zod";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { handler, needFeature, needUser, rateLimit, readJson } from "@/lib/api";

const schema = z.object({ category: z.enum(["suggestion", "bug", "content"]), body: z.string().trim().min(5, "متن حداقل ۵ نویسه باشد.").max(3000), anonymous: z.boolean().default(false) });

export const POST = handler(async (req) => {
  const user = await needUser();
  await needFeature("suggestions");
  rateLimit(`sug:${user.id}`, 10, 60 * 60_000);
  const b = schema.parse(await readJson(req));
  await db.insert(suggestions).values({ category: b.category, body: b.body, userId: b.anonymous ? null : user.id });
  return { ok: true };
});
