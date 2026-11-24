import { and, desc, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { aiConversations } from "@/db/schema";
import { handler, needPerm } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  const user = await needPerm("ai");
  const q = new URL(req.url).searchParams.get("q")?.trim();
  const rows = await db.select().from(aiConversations).where(and(eq(aiConversations.userId, user.id), q ? ilike(aiConversations.title, `%${q.slice(0, 60)}%`) : undefined)).orderBy(desc(aiConversations.updatedAt)).limit(100);
  return { rows };
});
