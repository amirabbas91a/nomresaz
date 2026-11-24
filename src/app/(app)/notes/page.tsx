import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes, subjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { NotesClient } from "@/components/NotesClient";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "یادداشت" };

export default async function NotesPage() {
  const user = await requireUser();
  await gate("notes");
  const [rows, subs] = await Promise.all([
    db.select().from(notes).where(eq(notes.userId, user.id)).orderBy(desc(notes.createdAt)),
    db.select({ id: subjects.id, name: subjects.name }).from(subjects).where(eq(subjects.active, true)).orderBy(asc(subjects.sortOrder)),
  ]);
  return (
    <>
      <PageHeader title="یادداشت" subtitle="برگه‌های شخصی تو؛ فقط خودت می‌بینی" />
      <NotesClient notes={rows.map((r) => ({ id: r.id, title: r.title, body: r.body, noteDate: r.noteDate, color: r.color, subjectId: r.subjectId }))} subjects={subs} />
    </>
  );
}
