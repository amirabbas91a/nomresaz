"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, GripVertical, Loader2, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { JalaliDateInput } from "./JalaliDateInput";
import { QuestionView } from "./QuestionView";
import { QUESTION_TYPES } from "@/lib/exam";
import { fa } from "@/lib/jalali";
import { uid } from "@/lib/utils";
import type { ExamQuestion } from "@/db/schema";

export type ExamData = {
  id: number; title: string; description: string | null; subjectId: number | null; chapter: string | null; durationMin: number; maxAttempts: number;
  startsAt: string | null; endsAt: string | null; showResult: boolean; awardPoints: number; status: "draft" | "published" | "archived"; questions: ExamQuestion[];
};

const blank = (type: ExamQuestion["type"]): ExamQuestion => ({
  id: uid(), type, text: "", marks: 1,
  options: type === "mcq" ? ["", "", "", ""] : type === "multi" ? ["", "", ""] : undefined,
  correct: type === "mcq" ? 0 : type === "tf" ? true : type === "multi" ? [] : type === "essay" ? undefined : "",
});

export function ExamBuilder({ initial, subjects }: { initial: ExamData; subjects: { id: number; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [e, setE] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState(false);
  const [open, setOpen] = useState<string | null>(initial.questions[0]?.id ?? null);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [ai, setAi] = useState({ show: false, source: "", count: 5, busy: false });
  const set = <K extends keyof ExamData>(k: K, v: ExamData[K]) => setE((s) => ({ ...s, [k]: v }));
  const setQ = (i: number, patch: Partial<ExamQuestion>) => setE((s) => ({ ...s, questions: s.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) }));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= e.questions.length || from === to) return;
    const arr = [...e.questions];
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x);
    set("questions", arr);
  };
  const total = e.questions.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  async function save(status?: ExamData["status"]) {
    setSaving(true); setErr("");
    const payload = { ...e, status: status ?? e.status, id: undefined, subjectId: e.subjectId || null, questions: e.questions.map((q) => ({ ...q, marks: Number(q.marks) || 0, options: q.options?.map((o) => o.trim()) })) };
    const r = await fetch(`/api/exams/${e.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!r.ok) return setErr(j.error ?? "ذخیره ناموفق بود");
    if (status) set("status", status);
    toast("ok", status === "published" ? "آزمون منتشر شد." : "ذخیره شد.");
    router.refresh();
  }

  async function generate() {
    setAi((a) => ({ ...a, busy: true }));
    const r = await fetch("/api/exams/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: ai.source, count: ai.count }) });
    const j = await r.json().catch(() => ({}));
    setAi((a) => ({ ...a, busy: false }));
    if (!r.ok) return toast("error", j.error ?? "تولید سؤال ناموفق بود");
    set("questions", [...e.questions, ...(j.questions as ExamQuestion[])].slice(0, 100));
    setAi({ show: false, source: "", count: 5, busy: false });
    toast("info", `${fa(j.questions.length)} سؤال پیشنهادی اضافه شد؛ پیش از انتشار حتماً بررسی کنید.`);
  }

  return (
    <div className="grid gap-6">
      <section className="glass-solid grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label" htmlFor="et">عنوان آزمون</label><input id="et" className="input" value={e.title} onChange={(x) => set("title", x.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="ed">توضیح / قوانین</label><textarea id="ed" className="input" rows={3} value={e.description ?? ""} onChange={(x) => set("description", x.target.value)} /></div>
        <div><label className="label" htmlFor="es">درس</label><select id="es" className="input" value={e.subjectId ?? ""} onChange={(x) => set("subjectId", x.target.value ? Number(x.target.value) : null)}><option value="">—</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label className="label" htmlFor="ec">فصل</label><input id="ec" className="input" value={e.chapter ?? ""} onChange={(x) => set("chapter", x.target.value)} /></div>
        <div><label className="label" htmlFor="edu">مدت (دقیقه)</label><input id="edu" type="number" min={1} max={300} className="input" value={e.durationMin} onChange={(x) => set("durationMin", Number(x.target.value))} /></div>
        <div><label className="label" htmlFor="ema">حداکثر دفعات شرکت</label><input id="ema" type="number" min={1} max={10} className="input" value={e.maxAttempts} onChange={(x) => set("maxAttempts", Number(x.target.value))} /></div>
        <div><span className="label">شروع</span><JalaliDateInput value={e.startsAt} onChange={(v) => set("startsAt", v)} withTime label="شروع آزمون" /></div>
        <div><span className="label">پایان</span><JalaliDateInput value={e.endsAt} onChange={(v) => set("endsAt", v)} withTime label="پایان آزمون" /></div>
        <div><label className="label" htmlFor="ep">امتیاز آزمون (۰ = بدون امتیاز)</label><input id="ep" type="number" min={0} className="input" value={e.awardPoints} onChange={(x) => set("awardPoints", Number(x.target.value))} /></div>
        <div className="flex items-center gap-3 pt-6"><button type="button" role="switch" aria-checked={e.showResult} id="esr" className="switch" onClick={() => set("showResult", !e.showResult)} /><label htmlFor="esr" className="text-sm font-semibold">نمایش نتیجه به دانش‌آموز</label></div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 text-lg font-extrabold">سؤال‌ها <span className="badge">{fa(e.questions.length)} / ۱۰۰</span> <span className="badge badge-info">جمع بارم {fa(total)}</span></h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-sm" onClick={() => setAi((a) => ({ ...a, show: true }))}><Sparkles size={16} />تولید با هوش مصنوعی</button>
            <button className="btn btn-sm" onClick={() => setPreview(true)} disabled={!e.questions.length}><Eye size={16} />پیش‌نمایش</button>
          </div>
        </div>
        <div className="grid gap-3">
          {e.questions.map((q, i) => {
            const isOpen = open === q.id;
            return (
              <div key={q.id} draggable onDragStart={() => setDrag(i)} onDragOver={(ev) => { ev.preventDefault(); setOver(i); }} onDragEnd={() => { setDrag(null); setOver(null); }}
                onDrop={() => { if (drag !== null) move(drag, i); setDrag(null); setOver(null); }}
                className={`glass-solid transition ${over === i && drag !== null && drag !== i ? "ring-2 ring-[var(--brand-2)]" : ""} ${drag === i ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-2 p-3">
                  <span className="cursor-grab text-faint" aria-hidden><GripVertical size={18} /></span>
                  <button className="min-w-0 flex-1 text-start" onClick={() => setOpen(isOpen ? null : q.id)} aria-expanded={isOpen}>
                    <span className="badge badge-info me-2">{fa(i + 1)}</span><span className="badge me-2">{QUESTION_TYPES[q.type]}</span><span className="text-sm font-semibold">{q.text || "سؤال بدون متن"}</span>
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, i - 1)} aria-label="انتقال به بالا" disabled={i === 0}><ArrowUp size={16} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, i + 1)} aria-label="انتقال به پایین" disabled={i === e.questions.length - 1}><ArrowDown size={16} /></button>
                  <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => set("questions", e.questions.filter((_, j) => j !== i))} aria-label="حذف سؤال"><Trash2 size={16} /></button>
                </div>
                {isOpen && (
                  <div className="grid gap-3 border-t border-[var(--glass-border)] p-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <div><label className="label">نوع سؤال</label><select className="input" value={q.type} onChange={(x) => { const n = blank(x.target.value as ExamQuestion["type"]); setQ(i, { type: n.type, options: n.options, correct: n.correct }); }}>{Object.entries(QUESTION_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                      <div><label className="label">بارم</label><input type="number" min={0} step="0.25" className="input" value={q.marks} onChange={(x) => setQ(i, { marks: Number(x.target.value) })} /></div>
                    </div>
                    <div><label className="label">متن سؤال</label><textarea className="input" rows={3} value={q.text} onChange={(x) => setQ(i, { text: x.target.value })} /></div>
                    {(q.type === "mcq" || q.type === "multi") && (
                      <div className="grid gap-2">
                        <span className="label !mb-0">گزینه‌ها (گزینه صحیح را علامت بزنید)</span>
                        {q.options?.map((o, oi) => {
                          const checked = q.type === "mcq" ? q.correct === oi : Array.isArray(q.correct) && q.correct.includes(oi);
                          return (
                            <div key={oi} className="flex items-center gap-2">
                              <input type={q.type === "mcq" ? "radio" : "checkbox"} name={`c-${q.id}`} checked={checked} aria-label={`گزینه ${fa(oi + 1)} صحیح است`} className="h-5 w-5 accent-[var(--brand)]"
                                onChange={() => q.type === "mcq" ? setQ(i, { correct: oi }) : setQ(i, { correct: checked ? (q.correct as number[]).filter((c) => c !== oi) : [...((q.correct as number[]) ?? []), oi] })} />
                              <input className="input" placeholder={`گزینه ${fa(oi + 1)}`} value={o} onChange={(x) => setQ(i, { options: q.options!.map((p, k) => (k === oi ? x.target.value : p)) })} />
                              <button className="btn btn-ghost btn-icon btn-sm" disabled={(q.options?.length ?? 0) <= 2} onClick={() => setQ(i, { options: q.options!.filter((_, k) => k !== oi), correct: q.type === "mcq" ? 0 : [] })} aria-label="حذف گزینه"><Trash2 size={15} /></button>
                            </div>
                          );
                        })}
                        {(q.options?.length ?? 0) < 8 && <button className="btn btn-sm w-fit" onClick={() => setQ(i, { options: [...(q.options ?? []), ""] })}><Plus size={15} />گزینه</button>}
                      </div>
                    )}
                    {q.type === "tf" && (
                      <div className="flex gap-2">{[true, false].map((v) => <button key={String(v)} className="choice sq !w-auto flex-1" aria-pressed={q.correct === v} onClick={() => setQ(i, { correct: v })}><span className="mark">✓</span>{v ? "درست" : "نادرست"}</button>)}</div>
                    )}
                    {(q.type === "blank" || q.type === "short") && (
                      <div><label className="label">پاسخ(های) صحیح</label><input className="input" value={typeof q.correct === "string" ? q.correct : ""} onChange={(x) => setQ(i, { correct: x.target.value })} /><div className="hint mt-1">برای چند پاسخ پذیرفتنی، با علامت | جدا کنید.</div></div>
                    )}
                    {q.type === "essay" && <div className="badge badge-warn w-fit">سؤال تشریحی پس از ارسال، توسط مدیر تصحیح می‌شود.</div>}
                    <div><label className="label">توضیح پاسخ (اختیاری)</label><textarea className="input" rows={2} value={q.explanation ?? ""} onChange={(x) => setQ(i, { explanation: x.target.value })} /></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {e.questions.length < 100 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(QUESTION_TYPES).map(([k, l]) => <button key={k} className="btn btn-sm" onClick={() => { const q = blank(k as ExamQuestion["type"]); set("questions", [...e.questions, q]); setOpen(q.id); }}><Plus size={15} />{l}</button>)}
          </div>
        )}
      </section>

      {err && <div role="alert" className="badge badge-danger !rounded-xl !px-3 !py-2 text-sm">{err}</div>}
      <div className="glass-float safe-b !sticky bottom-20 z-10 flex flex-wrap items-center gap-2 p-3 md:bottom-4">
        <span className={e.status === "published" ? "badge badge-ok" : "badge"}>{e.status === "published" ? "منتشرشده" : e.status === "archived" ? "بایگانی" : "پیش‌نویس"}</span>
        <span className="flex-1" />
        <button className="btn" onClick={() => save()} disabled={saving}>{saving ? <Loader2 size={17} className="spin" /> : <Save size={17} />}ذخیره</button>
        {e.status !== "published" ? <button className="btn btn-primary" onClick={() => save("published")} disabled={saving}>انتشار</button> : <button className="btn" onClick={() => save("draft")} disabled={saving}>بازگشت به پیش‌نویس</button>}
        {e.status !== "archived" && <button className="btn btn-ghost" onClick={() => save("archived")} disabled={saving}>بایگانی</button>}
      </div>

      <Modal open={preview} onClose={() => setPreview(false)} title={`پیش‌نمایش: ${e.title}`} wide>
        <div className="grid gap-5">{e.questions.map((q, i) => <QuestionView key={q.id} q={q} index={i} value={undefined} onChange={() => {}} />)}</div>
      </Modal>
      <Modal open={ai.show} onClose={() => setAi((a) => ({ ...a, show: false }))} title="تولید سؤال با هوش مصنوعی">
        <p className="mt-0 text-sm text-muted">متن منبع را بچسبانید. سؤال‌ها فقط بر پایه همین متن ساخته می‌شوند و باید قبل از انتشار توسط شما بررسی شوند.</p>
        <textarea className="input" rows={8} placeholder="متن درس…" value={ai.source} onChange={(x) => setAi((a) => ({ ...a, source: x.target.value }))} />
        <div className="mt-3 flex items-center gap-3"><label className="label !mb-0" htmlFor="aic">تعداد</label><input id="aic" type="number" min={1} max={20} className="input !w-24" value={ai.count} onChange={(x) => setAi((a) => ({ ...a, count: Number(x.target.value) }))} />
          <span className="flex-1" /><button className="btn btn-primary" onClick={generate} disabled={ai.busy || ai.source.trim().length < 80}>{ai.busy && <Loader2 size={17} className="spin" />}تولید</button></div>
      </Modal>
    </div>
  );
}
