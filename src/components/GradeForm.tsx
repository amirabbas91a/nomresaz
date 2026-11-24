"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { fa } from "@/lib/jalali";

type Item = { id: string; text: string; marks: number; answer: string; current?: number };

export function GradeForm({ attemptId, student, items }: { attemptId: number; student: string; items: Item[] }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(items.map((i) => [i.id, i.current !== undefined ? String(i.current) : ""])));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const scores: Record<string, number> = {};
    for (const i of items) if (vals[i.id] !== "") scores[i.id] = Math.min(i.marks, Math.max(0, Number(vals[i.id])));
    const r = await fetch(`/api/attempts/${attemptId}/grade`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scores }) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "نمره ثبت شد."); setOpen(false); router.refresh();
  }
  return (
    <>
      <button className="btn btn-sm btn-primary" onClick={() => setOpen(true)}>تصحیح تشریحی</button>
      <Modal open={open} onClose={() => setOpen(false)} title={`تصحیح پاسخ‌های ${student}`} wide>
        <div className="grid gap-4">
          {items.map((i) => (
            <div key={i.id} className="glass-2 p-4">
              <div className="font-bold">{i.text}</div>
              <div className="my-2 whitespace-pre-line rounded-xl bg-[var(--input-bg)] p-3 text-sm">{i.answer || <span className="text-faint">بدون پاسخ</span>}</div>
              <label className="label">نمره (از {fa(i.marks)})</label>
              <input type="number" min={0} max={i.marks} step="0.25" className="input !w-32" value={vals[i.id]} onChange={(e) => setVals({ ...vals, [i.id]: e.target.value })} />
            </div>
          ))}
          <div className="flex justify-end"><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ثبت نمره</button></div>
        </div>
      </Modal>
    </>
  );
}
