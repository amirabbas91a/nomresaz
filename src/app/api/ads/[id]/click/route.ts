import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ads } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n)) return new Response("Not found", { status: 404 });
  const [ad] = await db.update(ads).set({ clicks: sql`${ads.clicks} + 1` }).where(eq(ads.id, n)).returning({ url: ads.linkUrl, active: ads.active });
  if (!ad?.url || !ad.active || !/^https?:\/\//i.test(ad.url)) return new Response("Not found", { status: 404 });
  return Response.redirect(ad.url, 302);
}
