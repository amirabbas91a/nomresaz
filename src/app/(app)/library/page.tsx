import Link from "next/link";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { Download, Eye, FileText, Film, Image as ImageIcon, LayoutGrid, List, Presentation, Search } from "lucide-react";
import { db } from "@/db";
import { files, resources, subjects } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { formatJalali } from "@/lib/jalali";
import { fileSizeLabel } from "@/lib/utils";
import { Empty, PageHeader } from "@/components/ui";

export const metadata = { title: "کتابخانه" };
const KINDS: Record<string, string> = { pdf: "PDF", handout: "جزوه", sample: "نمونه سؤال", answers: "پاسخ‌نامه", image: "تصویر", slides: "ارائه", video: "ویدئو", other: "فایل" };
const KIND_ICON: Record<string, typeof FileText> = { image: ImageIcon, slides: Presentation, video: Film };

export default async function Library({ searchParams }: { searchParams: Promise<{ subject?: string; kind?: string; q?: string; sort?: string; view?: string }> }) {
  await requireUser();
  await gate("library");
  const sp = await searchParams;
  const subs = await db.select().from(subjects).where(eq(subjects.active, true)).orderBy(asc(subjects.sortOrder));
  const conds = [eq(resources.status, "published")];
  if (sp.subject && Number(sp.subject)) conds.push(eq(resources.subjectId, Number(sp.subject)));
  if (sp.kind && KINDS[sp.kind]) conds.push(eq(resources.kind, sp.kind));
  if (sp.q?.trim()) conds.push(or(ilike(resources.title, `%${sp.q.trim()}%`), ilike(resources.description, `%${sp.q.trim()}%`), ilike(resources.chapter, `%${sp.q.trim()}%`))!);
  const rows = await db
    .select({ r: resources, sub: subjects.name, mime: files.mime, size: files.size })
    .from(resources)
    .leftJoin(subjects, eq(subjects.id, resources.subjectId))
    .leftJoin(files, eq(files.id, resources.fileId))
    .where(and(...conds))
    .orderBy(sp.sort === "popular" ? desc(resources.downloads) : desc(resources.createdAt))
    .limit(120);

  const view = sp.view === "list" ? "list" : "grid";
  const href = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { ...sp, ...o };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    const s = p.toString();
    return `/library${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader title="کتابخانه منابع" subtitle="جزوه، نمونه سؤال، پاسخ‌نامه و منابع مجاز به تفکیک درس" actions={
        <div className="flex gap-1">
          <Link href={href({ view: "grid" })} className="btn btn-icon" aria-label="نمای شبکه‌ای" aria-pressed={view === "grid"}><LayoutGrid size={18} /></Link>
          <Link href={href({ view: "list" })} className="btn btn-icon" aria-label="نمای فهرستی" aria-pressed={view === "list"}><List size={18} /></Link>
        </div>} />
      <form className="glass mb-4 flex flex-wrap items-center gap-2 p-3" role="search">
        <div className="relative min-w-[200px] flex-1"><Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" /><input name="q" defaultValue={sp.q} className="input !ps-10" placeholder="جست‌وجو در عنوان، فصل یا توضیح…" aria-label="جست‌وجو" /></div>
        {sp.subject && <input type="hidden" name="subject" value={sp.subject} />}
        {sp.kind && <input type="hidden" name="kind" value={sp.kind} />}
        <select name="sort" defaultValue={sp.sort ?? "new"} className="input !w-auto" aria-label="مرتب‌سازی"><option value="new">تازه‌ترین</option><option value="popular">پردانلودترین</option></select>
        <button className="btn btn-primary">اعمال</button>
      </form>
      <div className="mb-3 flex flex-wrap gap-2" aria-label="درس‌ها">
        <Link className="chip" href={href({ subject: undefined })} aria-pressed={!sp.subject}>همه درس‌ها</Link>
        {subs.map((s) => <Link key={s.id} className="chip" href={href({ subject: String(s.id) })} aria-pressed={sp.subject === String(s.id)}>{s.name}</Link>)}
      </div>
      <div className="mb-6 flex flex-wrap gap-2" aria-label="نوع منبع">
        <Link className="chip" href={href({ kind: undefined })} aria-pressed={!sp.kind}>همه انواع</Link>
        {Object.entries(KINDS).map(([k, l]) => <Link key={k} className="chip" href={href({ kind: k })} aria-pressed={sp.kind === k}>{l}</Link>)}
      </div>

      {rows.length === 0 ? <Empty title="منبعی یافت نشد" text="فیلترها را تغییر دهید؛ یا هنوز منبعی منتشر نشده است." /> : (
        <div className={view === "grid" ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "grid gap-3"}>
          {rows.map(({ r, sub, mime, size }) => {
            const Icon = KIND_ICON[r.kind] ?? FileText;
            const canPreview = mime && (mime.startsWith("image/") || mime === "application/pdf");
            return (
              <article key={r.id} className={`glass card-hover fade-up flex gap-4 p-5 ${view === "grid" ? "flex-col" : "items-center"}`}>
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[var(--brand-soft)] text-brand"><Icon size={23} /></span>
                  <div className="min-w-0"><h3 className="m-0 font-extrabold leading-7">{r.title}</h3><div className="mt-1 flex flex-wrap gap-1.5"><span className="badge badge-info">{KINDS[r.kind] ?? r.kind}</span>{sub && <span className="badge">{sub}</span>}{r.chapter && <span className="badge">{r.chapter}</span>}</div></div>
                </div>
                {view === "grid" && r.description && <p className="m-0 line-clamp-2 flex-1 text-sm text-muted">{r.description}</p>}
                <div className={`flex items-center gap-2 ${view === "list" ? "ms-auto" : ""}`}>
                  <span className="text-xs text-faint">{formatJalali(r.createdAt)}{size ? ` · ${fileSizeLabel(size)}` : ""}</span>
                  <span className="flex-1" />
                  {r.fileId && canPreview && <a className="btn btn-sm" href={`/api/files/${r.fileId}`} target="_blank" rel="noopener"><Eye size={16} />پیش‌نمایش</a>}
                  {r.fileId && <a className="btn btn-primary btn-sm" href={`/api/files/${r.fileId}?dl=1`}><Download size={16} />دانلود</a>}
                  {!r.fileId && r.externalUrl && <a className="btn btn-primary btn-sm" href={r.externalUrl} target="_blank" rel="noopener noreferrer">مشاهده</a>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
