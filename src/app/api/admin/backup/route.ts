import { db } from "@/db";
import { announcements, ads, assignments, contests, events, exams, features, notebooks, pages, programs, resources, roles, settings, subjects, surveys, tips } from "@/db/schema";
import { handler, HttpError, needUser } from "@/lib/api";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** Owner-only JSON export of content tables. Excludes passwords, sessions, files' binary data and personal answers. */
export const GET = handler(async () => {
  const user = await needUser();
  if (!user.isOwner) throw new HttpError(403, "فقط مالک اصلی می‌تواند پشتیبان بگیرد.");
  const data = {
    exportedAt: new Date().toISOString(),
    roles: await db.select().from(roles), subjects: await db.select().from(subjects), resources: await db.select().from(resources), tips: await db.select().from(tips),
    assignments: await db.select().from(assignments), exams: await db.select().from(exams), surveys: await db.select().from(surveys), events: await db.select().from(events),
    announcements: await db.select().from(announcements), ads: await db.select().from(ads), contests: await db.select().from(contests), programs: await db.select().from(programs),
    pages: await db.select().from(pages), notebooks: await db.select().from(notebooks), settings: await db.select().from(settings), features: await db.select().from(features),
  };
  await logAudit({ user, action: "backup.export", entity: "system" });
  return new Response(JSON.stringify(data, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="nomresaz-backup-${new Date().toISOString().slice(0, 10)}.json"` } });
});
