"use client";
import { Check } from "lucide-react";
import { fa } from "@/lib/jalali";

type Q = { id: string; type: string; text: string; options?: string[]; marks: number };

export function QuestionView({ q, index, value, onChange, disabled }: { q: Q; index: number; value: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  return (
    <fieldset className="m-0 border-0 p-0" disabled={disabled}>
      <legend className="mb-3 flex w-full items-start gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[var(--brand)] font-extrabold text-white">{fa(index + 1)}</span>
        <span className="flex-1 whitespace-pre-line text-[17px] font-bold leading-9">{q.text}</span>
        <span className="badge flex-none">{fa(q.marks)} نمره</span>
      </legend>
      <div className="grid gap-2.5 ps-12">
        {q.type === "mcq" && q.options?.map((o, i) => (
          <button type="button" key={i} role="radio" aria-checked={value === i} className="choice" onClick={() => onChange(i)}><span className="mark"><Check size={14} /></span><span>{o}</span></button>
        ))}
        {q.type === "multi" && q.options?.map((o, i) => {
          const arr = Array.isArray(value) ? (value as number[]) : [];
          const on = arr.includes(i);
          return <button type="button" key={i} role="checkbox" aria-checked={on} className="choice sq" onClick={() => onChange(on ? arr.filter((x) => x !== i) : [...arr, i])}><span className="mark"><Check size={14} /></span><span>{o}</span></button>;
        })}
        {q.type === "tf" && (
          <div className="grid grid-cols-2 gap-2.5">{[true, false].map((v) => <button type="button" key={String(v)} role="radio" aria-checked={value === v} className="choice" onClick={() => onChange(v)}><span className="mark"><Check size={14} /></span>{v ? "درست" : "نادرست"}</button>)}</div>
        )}
        {(q.type === "blank" || q.type === "short") && <input className="input" placeholder="پاسخ خود را بنویسید" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} aria-label="پاسخ" />}
        {q.type === "essay" && <textarea className="input" rows={6} placeholder="پاسخ تشریحی…" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} aria-label="پاسخ تشریحی" />}
      </div>
    </fieldset>
  );
}
