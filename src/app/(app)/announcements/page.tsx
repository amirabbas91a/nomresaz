import { desc, eq, or } from "drizzle-orm";
import { ExternalLink, Pin } from "lucide-react";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { formatJalali } from "@/lib/jalali";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "اطلاعیه‌ها" };

export default async function AnnouncementsPage() {
  await requireUser();
  await gate("announcements");
  const rows = await db.select().from(announcements).where(or(eq(announcements.status, "published"), eq(announcements.status, "archived"))).orderBy(desc(announcements.pinned), desc(announcements.createdAt)).limit(60);
  return (
    <>
      <PageHeader title="اطلاعیه‌ها" />
      {rows.length === 0 ? <Empty title="اطلاعیه‌ای ثبت نشده" /> : (
        <div className="grid gap-4">{rows.map((a) => (
          <article key={a.id} className={`glass-solid fade-up overflow-hidden ${a.status === "archived" ? "opacity-70" : ""}`}>
            {a.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.imageUrl} alt="" loading="lazy" className="max-h-56 w-full object-cover" />}
            <div className="p-5"><div className="flex flex-wrap items-center gap-2">{a.pinned && <span className="badge badge-warn"><Pin size={13} />برجسته</span>}{a.status === "archived" && <span className="badge">بایگانی</span>}<h3 className="m-0 font-extrabold">{a.title}</h3></div>
              <p className="mb-2 mt-2 whitespace-pre-line leading-8">{a.body}</p>
              <div className="flex items-center gap-3 text-xs text-faint"><span>{formatJalali(a.createdAt, true)}</span>{a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-brand">مشاهده پیوند<ExternalLink size={13} /></a>}</div></div>
          </article>
        ))}</div>
      )}
    </>
  );
}
