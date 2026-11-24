"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "./Toast";

type Q = { id: string; type: string; text: string; options?: string[]; required?: boolean };

export function SurveyForm({ id, questions, anonymous }: { id: number; questions: Q[]; anonymous: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [a, setA] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true); setErr("");
    const r = await fetch(`/api/surveys/${id}/respond`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: a }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "ارسال ناموفق بود");
    setDone(true); toast("ok", "پاسخ شما ثبت شد. سپاس!"); router.refresh();
  }
  if (done) return <div className="glass p-8 text-center"><Check className="mx-auto text-ok" size={36} /><p className="font-bold">پاسخ شما ثبت شد.</p></div>;
  return (
    <div className="grid gap-5">
      {anonymous && <div className="badge badge-info w-fit">این نظرسنجی ناشناس است؛ نام شما همراه پاسخ ذخیره نمی‌شود.</div>}
      {questions.map((q, qi) => (
        <section key={q.id} className="glass-solid p-5">
          <div className="mb-3 font-extrabold">{qi + 1}. {q.text}{q.required && <span className="text-danger"> *</span>}</div>
          <div className="grid gap-2.5">
            {q.type === "single" && q.options?.map((o, i) => <button key={i} type="button" role="radio" aria-checked={a[q.id] === i} className="choice" onClick={() => setA({ ...a, [q.id]: i })}><span className="mark"><Check size={14} /></span>{o}</button>)}
            {q.type === "multi" && q.options?.map((o, i) => { const arr = (a[q.id] as number[] | undefined) ?? []; const on = arr.includes(i); return <button key={i} type="button" role="checkbox" aria-checked={on} className="choice sq" onClick={() => setA({ ...a, [q.id]: on ? arr.filter((x) => x !== i) : [...arr, i] })}><span className="mark"><Check size={14} /></span>{o}</button>; })}
            {q.type === "scale" && <div className="grid grid-cols-5 gap-2">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={a[q.id] === n} className="choice !justify-center !px-0" onClick={() => setA({ ...a, [q.id]: n })}>{["۱", "۲", "۳", "۴", "۵"][n - 1]}</button>)}</div>}
            {q.type === "scale" && <div className="flex justify-between text-xs text-faint"><span>کمترین</span><span>بیشترین</span></div>}
            {q.type === "text" && <textarea className="input" rows={3} maxLength={2000} value={String(a[q.id] ?? "")} onChange={(e) => setA({ ...a, [q.id]: e.target.value })} aria-label="پاسخ" />}
          </div>
        </section>
      ))}
      {err && <div role="alert" className="badge badge-danger !rounded-xl !px-3 !py-2 text-sm">{err}</div>}
      <button className="btn btn-primary w-fit !px-10" onClick={submit} disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ارسال پاسخ</button>
    </div>
  );
}
