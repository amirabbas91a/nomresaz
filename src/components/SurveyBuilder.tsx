"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useToast } from "./Toast";
import { JalaliDateInput } from "./JalaliDateInput";
import { uid } from "@/lib/utils";
import type { SurveyQuestion } from "@/db/schema";

export type SurveyData = { id: number; title: string; description: string | null; startsAt: string | null; endsAt: string | null; anonymous: boolean; status: "draft" | "published" | "archived"; questions: SurveyQuestion[] };
const TYPES: Record<string, string> = { single: "تک‌گزینه‌ای", multi: "چندگزینه‌ای", text: "متنی", scale: "مقیاس ۱ تا ۵" };

export function SurveyBuilder({ initial }: { initial: SurveyData }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = <K extends keyof SurveyData>(k: K, v: SurveyData[K]) => setS((x) => ({ ...x, [k]: v }));
  const setQ = (i: number, p: Partial<SurveyQuestion>) => set("questions", s.questions.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const move = (i: number, d: number) => { const a = [...s.questions]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set("questions", a); };

  async function save(status?: SurveyData["status"]) {
    setBusy(true); setErr("");
    const r = await fetch(`/api/surveys/${s.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, id: undefined, status: status ?? s.status }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "ذخیره ناموفق بود");
    if (status) set("status", status);
    toast("ok", "ذخیره شد."); router.refresh();
  }

  return (
    <div className="grid gap-5">
      <section className="glass-solid grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="st">عنوان</label><input id="st" className="input" value={s.title} onChange={(e) => set("title", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="sd">توضیح</label><textarea id="sd" className="input" rows={2} value={s.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div><span className="label">شروع</span><JalaliDateInput value={s.startsAt} onChange={(v) => set("startsAt", v)} withTime label="شروع" /></div>
        <div><span className="label">پایان</span><JalaliDateInput value={s.endsAt} onChange={(v) => set("endsAt", v)} withTime label="پایان" /></div>
        <div className="flex items-center gap-3"><button type="button" role="switch" aria-checked={s.anonymous} id="sa" className="switch" onClick={() => set("anonymous", !s.anonymous)} /><label htmlFor="sa" className="text-sm font-semibold">پاسخ‌ها ناشناس ثبت شود</label></div>
      </section>
      <div className="grid gap-3">
        {s.questions.map((q, i) => (
          <div key={q.id} className="glass-solid grid gap-3 p-4">
            <div className="flex items-center gap-2"><span className="badge badge-info">{i + 1}</span>
              <select className="input !w-auto" value={q.type} aria-label="نوع پرسش" onChange={(e) => setQ(i, { type: e.target.value as SurveyQuestion["type"], options: e.target.value === "single" || e.target.value === "multi" ? q.options?.length ? q.options : ["", ""] : undefined })}>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              <span className="flex-1" />
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, -1)} aria-label="بالا"><ArrowUp size={16} /></button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, 1)} aria-label="پایین"><ArrowDown size={16} /></button>
              <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => set("questions", s.questions.filter((_, j) => j !== i))} aria-label="حذف"><Trash2 size={16} /></button>
            </div>
            <input className="input" placeholder="متن پرسش" value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} aria-label="متن پرسش" />
            {(q.type === "single" || q.type === "multi") && (
              <div className="grid gap-2">{q.options?.map((o, oi) => (
                <div key={oi} className="flex gap-2"><input className="input" placeholder={`گزینه ${oi + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options!.map((p, k) => (k === oi ? e.target.value : p)) })} /><button className="btn btn-ghost btn-icon btn-sm" onClick={() => setQ(i, { options: q.options!.filter((_, k) => k !== oi) })} aria-label="حذف گزینه"><Trash2 size={15} /></button></div>
              ))}<button className="btn btn-sm w-fit" onClick={() => setQ(i, { options: [...(q.options ?? []), ""] })}><Plus size={15} />گزینه</button></div>
            )}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={!!q.required} onChange={(e) => setQ(i, { required: e.target.checked })} />پاسخ الزامی است</label>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">{Object.entries(TYPES).map(([k, l]) => <button key={k} className="btn btn-sm" onClick={() => set("questions", [...s.questions, { id: uid(), type: k as SurveyQuestion["type"], text: "", options: k === "single" || k === "multi" ? ["", ""] : undefined }])}><Plus size={15} />{l}</button>)}</div>
      {err && <div role="alert" className="badge badge-danger !rounded-xl !px-3 !py-2 text-sm">{err}</div>}
      <div className="glass-float !sticky bottom-20 z-10 flex flex-wrap items-center gap-2 p-3 md:bottom-4">
        <span className="badge">{s.status === "published" ? "منتشرشده" : s.status === "archived" ? "بایگانی" : "پیش‌نویس"}</span><span className="flex-1" />
        <button className="btn" onClick={() => save()} disabled={busy}>{busy ? <Loader2 size={17} className="spin" /> : <Save size={17} />}ذخیره</button>
        {s.status !== "published" ? <button className="btn btn-primary" onClick={() => save("published")} disabled={busy}>انتشار</button> : <button className="btn" onClick={() => save("archived")} disabled={busy}>بایگانی</button>}
      </div>
    </div>
  );
}
