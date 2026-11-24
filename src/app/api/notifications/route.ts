import { and, asc, desc, eq, gte, lte, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { announcements, assignmentDone, assignments, events } from "@/db/schema";
import { handler, needUser } from "@/lib/api";
import { getDisabledFeatures } from "@/lib/settings";
import { formatJalali } from "@/lib/jalali";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await needUser();
  const off = await getDisabledFeatures();
  const items: { id: string; title: string; body: string; href: string; kind: string }[] = [];
  const now = new Date();
  if (!off.has("assignments")) {
    const done = db.select({ id: assignmentDone.assignmentId }).from(assignmentDone).where(eq(assignmentDone.userId, user.id));
    const rows = await db
      .select()
      .from(assignments)
      .where(and(eq(assignments.status, "active"), gte(assignments.dueDate, now), lte(assignments.dueDate, new Date(now.getTime() + 3 * 86400_000)), notInArray(assignments.id, sql`(${done})`)))
      .orderBy(asc(assignments.dueDate))
      .limit(4);
    for (const a of rows) items.push({ id: `a${a.id}`, kind: "assignment", title: `مهلت تکلیف: ${a.title}`, body: `تا ${formatJalali(a.dueDate, true)}`, href: "/assignments" });
  }
  if (!off.has("calendar")) {
    const rows = await db.select().from(events).where(and(gte(events.startsAt, now), lte(events.startsAt, new Date(now.getTime() + 2 * 86400_000)))).orderBy(asc(events.startsAt)).limit(3);
    for (const e of rows) items.push({ id: `e${e.id}`, kind: "event", title: `یادآوری: ${e.title}`, body: formatJalali(e.startsAt, true), href: "/calendar" });
  }
  if (!off.has("announcements")) {
    const rows = await db.select().from(announcements).where(eq(announcements.status, "published")).orderBy(desc(announcements.createdAt)).limit(4);
    for (const a of rows) items.push({ id: `n${a.id}`, kind: "announcement", title: a.title, body: a.body, href: "/announcements" });
  }
  return { items };
});
