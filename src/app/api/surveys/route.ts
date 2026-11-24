import { db } from "@/db";
import { surveys } from "@/db/schema";
import { handler, needPerm } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const POST = handler(async () => {
  const user = await needPerm("surveys");
  const [row] = await db.insert(surveys).values({ title: "نظرسنجی جدید" }).returning({ id: surveys.id });
  await logAudit({ user, action: "surveys.create", entity: "surveys", entityId: row.id });
  return { id: row.id };
});
