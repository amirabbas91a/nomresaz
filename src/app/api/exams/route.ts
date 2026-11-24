import { db } from "@/db";
import { exams } from "@/db/schema";
import { handler, needPerm } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const POST = handler(async () => {
  const user = await needPerm("exams");
  const [row] = await db.insert(exams).values({ title: "آزمون جدید", createdBy: user.id }).returning({ id: exams.id });
  await logAudit({ user, action: "exams.create", entity: "exams", entityId: row.id });
  return { id: row.id };
});
