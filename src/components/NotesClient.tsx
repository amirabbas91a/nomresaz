"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { JalaliDateInput } from "./JalaliDateInput";
import { Empty } from "./ui";
import { formatJalaliString, todayJalaliString, toJalali } from "@/lib/jalali";

type Note = { id: number; title: string; body: string; noteDate: string; color: string; subjectId: number | null };
const COLORS = [["yellow", "زرد"], ["blue", "آبی"], ["green", "سبز"], ["pink", "صورتی"]] as const;

export function NotesClient({ notes, subjects }: { notes: Note[]; subjects: { id: number; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState("yellow");
  const [dateIso, setDateIso] = useState<string | null>(new Date().toISOString());

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const j = toJalali(new Date(dateIso ?? Date.now()));
    const noteDate = `${j.jy}/${String(j.jm).padStart(2, "0")}/${String(j.jd).padStart(2, "0")}` || todayJalaliString();
    const r = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: fd.get("title"), body: fd.get("body"), subjectId: fd.get("subjectId") ? Number(fd.get("subjectId")) : null, color, noteDate }) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "یادداشت ذخیره شد.");
    setOpen(false);
    router.refresh();
  }
  async function del(id: number) {
    const r = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    if (r.ok) { toast("ok", "حذف شد."); router.refresh(); }
  }

  return (
    <>
      <div className="mb-5 flex justify-end"><button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={18} />یادداشت جدید</button></div>
      {notes.length === 0 ? <Empty title="یادداشتی نداری" text="اولین یادداشتت را بنویس." /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <article key={n.id} className={`sheet sheet-${n.color} fade-up`}>
              <div className="flex items-start justify-between gap-2"><h3>{n.title}</h3><button className="btn btn-ghost btn-icon btn-sm !text-[#7a2a2a]" onClick={() => del(n.id)} aria-label="حذف یادداشت"><Trash2 size={16} /></button></div>
              <div className="text-xs opacity-70">{formatJalaliString(n.noteDate)}{n.subjectId ? ` · ${subjects.find((s) => s.id === n.subjectId)?.name ?? ""}` : ""}</div>
              <p className="m-0 whitespace-pre-line">{n.body}</p>
            </article>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="یادداشت جدید">
        <form onSubmit={save} className="grid gap-4">
          <div><label className="label">تاریخ</label><JalaliDateInput value={dateIso} onChange={setDateIso} clearable={false} label="تاریخ یادداشت" /></div>
          <div><label className="label" htmlFor="nt">عنوان</label><input id="nt" name="title" className="input" required maxLength={120} /></div>
          <div><label className="label" htmlFor="ns">درس</label><select id="ns" name="subjectId" className="input"><option value="">—</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label" htmlFor="nb">متن</label><textarea id="nb" name="body" className="input" rows={5} required maxLength={5000} /></div>
          <div><span className="label">رنگ برگه</span><div className="flex gap-2">{COLORS.map(([k, l]) => <button type="button" key={k} onClick={() => setColor(k)} aria-pressed={color === k} className={`sheet-${k} h-10 flex-1 rounded-xl border-2 text-sm font-bold text-[#333] ${color === k ? "border-[var(--brand)]" : "border-transparent"}`}>{l}</button>)}</div></div>
          <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ذخیره</button>
        </form>
      </Modal>
    </>
  );
}
