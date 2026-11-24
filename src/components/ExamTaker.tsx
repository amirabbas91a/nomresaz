"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { Modal } from "./Modal";
import { QuestionView } from "./QuestionView";
import { useToast } from "./Toast";
import { fa } from "@/lib/jalali";

type Q = { id: string; type: string; text: string; options?: string[]; marks: number };

function isAnswered(v: unknown) {
  return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0) && !(typeof v === "string" && !v.trim());
}

export function ExamTaker({ attemptId, examId, title, questions, initialAnswers, remainingMs }: { attemptId: number; examId: number; title: string; questions: Q[]; initialAnswers: Record<string, unknown>; remainingMs: number }) {
  const router = useRouter();
  const toast = useToast();
  const [answers, setAnswers] = useState(initialAnswers);
  const [cur, setCur] = useState(0);
  const [left, setLeft] = useState(remainingMs);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const deadline = useRef(Date.now() + remainingMs);
  const submitting = useRef(false);
  const dirty = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const submit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    const r = await fetch(`/api/attempts/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: answersRef.current, submit: true }) });
    if (r.ok || r.status === 409) { router.replace(`/exams/${examId}/result/${attemptId}`); router.refresh(); return; }
    submitting.current = false;
    setBusy(false);
    toast("error", (await r.json().catch(() => ({}))).error ?? "ارسال ناموفق بود؛ دوباره تلاش کنید.");
  }, [attemptId, examId, router, toast]);

  useEffect(() => {
    const t = setInterval(() => {
      const l = deadline.current - Date.now();
      setLeft(Math.max(0, l));
      if (l <= 0) { clearInterval(t); submit(); }
    }, 500);
    return () => clearInterval(t);
  }, [submit]);

  useEffect(() => {
    if (!dirty.current) return;
    const t = setTimeout(async () => {
      setSaved("saving");
      const r = await fetch(`/api/attempts/${attemptId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) }).catch(() => null);
      setSaved(r?.ok ? "saved" : "error");
    }, 700);
    return () => clearTimeout(t);
  }, [answers, attemptId]);

  const setAns = (id: string, v: unknown) => { dirty.current = true; setAnswers((a) => ({ ...a, [id]: v })); };
  const done = questions.filter((q) => isAnswered(answers[q.id])).length;
  const mm = String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const low = left < 60_000;
  const q = questions[cur];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="glass-float !sticky top-2 z-20 mb-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="m-0 truncate text-base font-extrabold">{title}</h1>
          <div className={`flex items-center gap-2 rounded-2xl px-3 py-1.5 font-extrabold ${low ? "badge-danger" : "badge-info"} badge !text-base`} role="timer" aria-label="زمان باقی‌مانده"><Clock size={18} /><span className="num">{fa(mm)}:{fa(ss)}</span></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--glass-bg-2)]"><div className="h-full rounded-full bg-[var(--brand)] transition-all" style={{ width: `${(done / questions.length) * 100}%` }} /></div>
        <div className="mt-1.5 flex justify-between text-xs text-muted"><span>{fa(done)} از {fa(questions.length)} پاسخ داده شده</span><span>{saved === "saving" ? "در حال ذخیره…" : saved === "saved" ? "ذخیره شد ✓" : saved === "error" ? "خطا در ذخیره؛ اتصال را بررسی کنید" : ""}</span></div>
      </div>

      <div className="glass-solid p-6"><QuestionView key={q.id} q={q} index={cur} value={answers[q.id]} onChange={(v) => setAns(q.id, v)} /></div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button className="btn" disabled={cur === 0} onClick={() => setCur(cur - 1)}>قبلی</button>
        {cur < questions.length - 1 ? <button className="btn btn-primary" onClick={() => setCur(cur + 1)}>بعدی</button> : <button className="btn btn-primary" onClick={() => setConfirm(true)}><Send size={17} />پایان و ارسال</button>}
      </div>

      <nav aria-label="شماره سؤال‌ها" className="glass mt-6 flex flex-wrap gap-2 p-4">
        {questions.map((x, i) => (
          <button key={x.id} onClick={() => setCur(i)} aria-current={i === cur ? "true" : undefined} aria-label={`سؤال ${fa(i + 1)}${isAnswered(answers[x.id]) ? " پاسخ داده شده" : ""}`}
            className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-bold ${i === cur ? "border-[var(--brand)] bg-[var(--brand)] text-white" : isAnswered(answers[x.id]) ? "border-transparent bg-[var(--ok-bg)] text-ok" : "border-[var(--glass-border)] bg-[var(--glass-bg-2)]"}`}>{fa(i + 1)}</button>
        ))}
        <button className="btn btn-sm ms-auto" onClick={() => setConfirm(true)}><CheckCircle2 size={16} />ارسال نهایی</button>
      </nav>

      <Modal open={confirm} onClose={() => setConfirm(false)} title="ارسال نهایی آزمون">
        <p className="mt-0">{fa(done)} سؤال از {fa(questions.length)} سؤال پاسخ داده شده است.{done < questions.length && " به سؤال‌های بی‌پاسخ نمره‌ای تعلق نمی‌گیرد."} پس از ارسال، امکان تغییر وجود ندارد.</p>
        <div className="flex justify-end gap-2"><button className="btn" onClick={() => setConfirm(false)}>بازگشت</button><button className="btn btn-primary" onClick={submit} disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ارسال نهایی</button></div>
      </Modal>
    </div>
  );
}
