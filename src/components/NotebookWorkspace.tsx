"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowUp, Bold, Check, FileDown, FileText, Heading1, Heading2, Heading3, Image as ImageIcon, Italic, List, ListOrdered, Loader2, Mic, Pause, Play, Quote, Redo2, Send, Sparkles, Square, Table2, Trash2, Type, Undo2, Eraser,
} from "lucide-react";
import { MarkdownView } from "./MarkdownView";
import { useToast } from "./Toast";
import { fa } from "@/lib/jalali";
import { normalizeFa, uid } from "@/lib/utils";
import type { NotebookSource } from "@/db/schema";

type Props = {
  nb: { id: number; title: string; subjectId: number | null; style: string; sources: NotebookSource[]; content: string; status: string; statusNote: string | null; hasDocx: boolean };
  subjects: { id: number; name: string; teacher: string | null }[];
};
const STEPS = ["ورود محتوا", "بازبینی متن", "درس و سبک", "ویرایش", "خروجی و انتشار"];
const STYLES = [["full", "کامل"], ["summary", "خلاصه"], ["exam", "مرور امتحانی"], ["custom", "دلخواه"]];
const STATUS_FA: Record<string, string> = { draft: "پیش‌نویس", pending: "در انتظار تأیید", published: "منتشرشده", failed: "ناموفق / ردشده" };

export function NotebookWorkspace({ nb, subjects }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(nb.content ? 3 : 0);
  const [inTab, setInTab] = useState<"text" | "image" | "audio">("text");
  const [title, setTitle] = useState(nb.title);
  const [subjectId, setSubjectId] = useState<number | null>(nb.subjectId);
  const [style, setStyle] = useState(nb.style);
  const [sources, setSources] = useState<NotebookSource[]>(nb.sources);
  const [content, setContent] = useState(nb.content);
  const [status, setStatus] = useState(nb.status);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState("");
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [draftText, setDraftText] = useState("");
  const [docxUrl, setDocxUrl] = useState<string | null>(null);
  const [showPrev, setShowPrev] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const hist = useRef<{ stack: string[]; idx: number }>({ stack: [nb.content], idx: 0 });
  const dirty = useRef(false);
  const readOnly = status === "pending" || status === "published";
  const subject = subjects.find((s) => s.id === subjectId);

  const mark = () => { dirty.current = true; };
  const pushHist = (v: string) => { const h = hist.current; h.stack = [...h.stack.slice(0, h.idx + 1), v].slice(-100); h.idx = h.stack.length - 1; };
  const edit = (v: string, record = true) => { setContent(v); mark(); if (record) pushHist(v); };
  const undo = () => { const h = hist.current; if (h.idx > 0) { h.idx--; setContent(h.stack[h.idx]); mark(); } };
  const redo = () => { const h = hist.current; if (h.idx < h.stack.length - 1) { h.idx++; setContent(h.stack[h.idx]); mark(); } };

  const save = useCallback(async () => {
    setSaveState("saving");
    const r = await fetch(`/api/notebooks/${nb.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title || "بدون عنوان", subjectId, style, content, sources }) }).catch(() => null);
    setSaveState(r?.ok ? "saved" : "error");
    if (r?.ok) dirty.current = false;
    return !!r?.ok;
  }, [nb.id, title, subjectId, style, content, sources]);

  useEffect(() => {
    if (readOnly || !dirty.current) return;
    const t = setTimeout(save, 2000);
    return () => clearTimeout(t);
  }, [title, subjectId, style, content, sources, save, readOnly]);

  const setSrc = (list: NotebookSource[]) => { setSources(list); mark(); };

  async function postFile(url: string, file: File) {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch(url, { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "خطا در پردازش");
    return j as { text: string; uncertain?: boolean };
  }

  async function addImages(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const id = uid();
      setPreviews((p) => ({ ...p, [id]: URL.createObjectURL(f) }));
      setBusy(`ocr-${id}`);
      let text = ""; let uncertain = false;
      try { const r = await postFile("/api/notebooks/ocr", f); text = r.text; uncertain = !!r.uncertain; toast("ok", `متن «${f.name}» استخراج شد؛ لطفاً بازبینی کنید.`); }
      catch (e) { toast("error", e instanceof Error ? e.message : "OCR ناموفق بود"); }
      setSources((s) => [...s, { id, type: "image", name: f.name, text, uncertain }]); mark();
    }
    setBusy(null);
  }

  // Audio recording (multiple segments)
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [rec, setRec] = useState<"idle" | "rec" | "paused">("idle");
  const [segments, setSegments] = useState<{ id: string; url: string; blob: Blob; name: string }[]>([]);
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        setSegments((s) => [...s, { id: uid(), url: URL.createObjectURL(blob), blob, name: `ضبط ${fa(s.length + 1)}` }]);
        setRec("idle");
      };
      mr.start(); recRef.current = mr; setRec("rec");
    } catch { toast("error", "دسترسی به میکروفن داده نشد یا پشتیبانی نمی‌شود."); }
  }
  async function transcribe(id: string, blob: Blob, name: string) {
    setBusy(`stt-${id}`);
    try {
      const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : blob.type.includes("wav") ? "wav" : blob.type.includes("mpeg") ? "mp3" : "webm";
      const r = await postFile("/api/notebooks/transcribe", new File([blob], `${name}.${ext}`, { type: blob.type.split(";")[0] || "audio/webm" }));
      setSrc([...sources, { id: uid(), type: "audio", name, text: r.text }]);
      toast("ok", "متن گفتار آماده شد؛ لطفاً بازبینی کنید.");
    } catch (e) { toast("error", e instanceof Error ? e.message : "تبدیل ناموفق بود"); }
    setBusy(null);
  }

  async function ai(mode: string, whole = false) {
    const ta = taRef.current;
    const hasSel = !whole && ta && ta.selectionEnd > ta.selectionStart && step === 3;
    const input = mode === "build" ? sources.map((s, i) => `--- منبع ${i + 1} (${s.name}) ---\n${s.text}`).join("\n\n") : hasSel ? content.slice(ta!.selectionStart, ta!.selectionEnd) : content;
    if (!input.trim()) return toast("error", "متنی برای پردازش وجود ندارد.");
    if (mode === "build" && content.trim() && !confirm("متن فعلی ویرایشگر با خروجی جدید جایگزین می‌شود. ادامه می‌دهید؟")) return;
    setBusy(`ai-${mode}`); setAiNote("در حال ارسال متن به سرویس هوش مصنوعی…");
    try {
      const r = await fetch("/api/notebooks/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, text: input, style, subject: subject?.name }) });
      setAiNote("پاسخ دریافت شد؛ در حال اعمال…");
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "خطای سرویس");
      if (mode === "title" || mode === "ambiguity") { setAiNote(j.text); setBusy(null); return; }
      if (hasSel) edit(content.slice(0, ta!.selectionStart) + j.text + content.slice(ta!.selectionEnd));
      else edit(j.text);
      setAiNote(""); toast("ok", "اعمال شد؛ با Undo می‌توانید برگردید.");
      if (mode === "build") setStep(3);
    } catch (e) { setAiNote(""); toast("error", e instanceof Error ? e.message : "خطا"); }
    setBusy(null);
  }

  function wrap(before: string, after = before) {
    const ta = taRef.current; if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const sel = content.slice(s, e) || "متن";
    edit(content.slice(0, s) + before + sel + after + content.slice(e));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(s + before.length, s + before.length + sel.length); });
  }
  function linePrefix(p: string) {
    const ta = taRef.current; if (!ta) return;
    const s = content.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    edit(content.slice(0, s) + p + content.slice(s));
    setTimeout(() => ta.focus());
  }
  const insertAt = (txt: string) => { const ta = taRef.current; const p = ta?.selectionStart ?? content.length; edit(content.slice(0, p) + txt + content.slice(p)); };

  async function makeDocx() {
    setBusy("docx");
    await save();
    const r = await fetch(`/api/notebooks/${nb.id}/docx`, { method: "POST" });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return toast("error", j.error ?? "ساخت DOCX ناموفق بود");
    setDocxUrl(j.url); toast("ok", "فایل DOCX آماده شد.");
  }
  async function action(a: "request" | "withdraw") {
    setBusy(a);
    if (a === "request") await save();
    const r = await fetch(`/api/notebooks/${nb.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: a }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!r.ok) return toast("error", j.error ?? "خطا");
    setStatus(a === "request" ? "pending" : "draft"); toast("ok", a === "request" ? "درخواست انتشار ثبت شد." : "درخواست بازپس گرفته شد."); router.refresh();
  }
  async function remove() {
    if (!confirm("این نکته‌نامه حذف شود؟")) return;
    const r = await fetch(`/api/notebooks/${nb.id}`, { method: "DELETE" });
    if (r.ok) router.push("/notebook");
  }

  const Tool = ({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) => (
    <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClick} aria-label={label} title={label} disabled={readOnly}>{children}</button>
  );

  return (
    <div className="grid gap-5">
      <nav aria-label="مراحل" className="glass flex gap-1 overflow-x-auto p-2">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined} className={`flex flex-none items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${step === i ? "bg-[var(--brand)] text-white" : "text-muted hover:bg-[var(--glass-bg-2)]"}`}>
            <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${step === i ? "bg-white/25" : "bg-[var(--glass-bg-2)]"}`}>{fa(i + 1)}</span>{s}
          </button>
        ))}
        <span className="flex-1" />
        <span className="flex items-center gap-2 px-2 text-xs text-muted">{readOnly ? <span className="badge badge-warn">{STATUS_FA[status]} (قفل ویرایش)</span> : saveState === "saving" ? "در حال ذخیره…" : saveState === "saved" ? "ذخیره شد ✓" : saveState === "error" ? <span className="text-danger">خطا در ذخیره</span> : ""}</span>
      </nav>

      {step === 0 && (
        <section className="glass-solid p-5">
          <h2 className="mt-0 text-lg font-extrabold">منبع را وارد کنید</h2>
          <p className="mt-0 text-sm text-muted">می‌توانید عکس، صدا و متن را در یک پروژه ترکیب کنید.</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {([["text", "نوشتن متن", Type], ["image", "عکس", ImageIcon], ["audio", "صدا", Mic]] as const).map(([k, l, Ic]) => <button key={k} className="chip" aria-pressed={inTab === k} onClick={() => setInTab(k)}><Ic size={16} className="me-2" />{l}</button>)}
          </div>
          {inTab === "text" && (
            <div className="grid gap-3"><textarea className="input" rows={8} placeholder="متن درس یا یادداشت‌های خود را بنویسید یا بچسبانید…" value={draftText} onChange={(e) => setDraftText(e.target.value)} aria-label="متن" />
              <button className="btn btn-primary w-fit" disabled={!draftText.trim() || readOnly} onClick={() => { setSrc([...sources, { id: uid(), type: "text", name: `متن ${fa(sources.filter((s) => s.type === "text").length + 1)}`, text: draftText }]); setDraftText(""); toast("ok", "به منابع افزوده شد."); }}>افزودن به منابع</button></div>
          )}
          {inTab === "image" && (
            <div className="grid gap-3"><label className="glass-2 grid cursor-pointer place-items-center gap-2 border-2 border-dashed p-8 text-center"><ImageIcon size={28} className="text-brand" /><span className="font-bold">انتخاب یک یا چند عکس (PNG/JPEG/WebP تا ۴ مگابایت)</span><span className="hint">متن فارسی با سرویس OCR استخراج می‌شود؛ بخش‌های نامطمئن علامت می‌خورند.</span><input type="file" multiple accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => addImages(e.target.files)} disabled={readOnly} /></label>
              {busy?.startsWith("ocr") && <div className="flex items-center gap-2 text-sm"><Loader2 size={16} className="spin" />در حال استخراج متن…</div>}</div>
          )}
          {inTab === "audio" && (
            <div className="grid gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {rec === "idle" && <button className="btn btn-primary" onClick={startRec} disabled={readOnly}><Mic size={17} />شروع ضبط</button>}
                {rec === "rec" && <><button className="btn" onClick={() => { recRef.current?.pause(); setRec("paused"); }}><Pause size={17} />توقف موقت</button><button className="btn btn-danger" onClick={() => recRef.current?.stop()}><Square size={17} />پایان ضبط</button><span className="badge badge-danger">● در حال ضبط</span></>}
                {rec === "paused" && <><button className="btn" onClick={() => { recRef.current?.resume(); setRec("rec"); }}><Play size={17} />ادامه</button><button className="btn btn-danger" onClick={() => recRef.current?.stop()}><Square size={17} />پایان ضبط</button></>}
                <label className="btn cursor-pointer">بارگذاری فایل صوتی<input type="file" accept="audio/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSegments((s) => [...s, { id: uid(), url: URL.createObjectURL(f), blob: f, name: f.name.replace(/\.[^.]+$/, "") }]); }} /></label>
              </div>
              {segments.map((s) => (
                <div key={s.id} className="glass-2 flex flex-wrap items-center gap-3 p-3"><span className="font-bold">{s.name}</span><audio controls src={s.url} className="h-9 max-w-full" /><span className="flex-1" />
                  <button className="btn btn-sm btn-primary" onClick={() => transcribe(s.id, s.blob, s.name)} disabled={busy === `stt-${s.id}`}>{busy === `stt-${s.id}` && <Loader2 size={15} className="spin" />}تبدیل به متن</button>
                  <button className="btn btn-sm btn-ghost text-danger" onClick={() => setSegments(segments.filter((x) => x.id !== s.id))} aria-label="حذف ضبط"><Trash2 size={15} /></button></div>
              ))}
              <p className="hint m-0">هر بخش ضبط حداکثر ۴ مگابایت (حدود چند دقیقه). برای گفتار طولانی چند بخش ضبط کنید.</p>
            </div>
          )}
          <div className="mt-5 flex justify-between"><span className="badge">{fa(sources.length)} منبع افزوده شده</span><button className="btn btn-primary" onClick={() => setStep(1)} disabled={!sources.length}>مرحله بعد</button></div>
        </section>
      )}

      {step === 1 && (
        <section className="grid gap-3">
          <div className="badge badge-info w-fit">متن هر منبع را بازبینی و در صورت لزوم ویرایش کنید. بخش‌های <b>[؟ …]</b> نامطمئن‌اند و حدس زده نمی‌شوند.</div>
          {sources.length === 0 && <div className="glass-2 p-6 text-center text-sm text-muted">منبعی وجود ندارد؛ به مرحله اول بروید.</div>}
          {sources.map((s, i) => (
            <div key={s.id} className="glass-solid p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {s.type === "image" ? <ImageIcon size={17} /> : s.type === "audio" ? <Mic size={17} /> : <FileText size={17} />}<span className="font-bold">{s.name}</span>
                {(s.uncertain || s.text.includes("[؟")) && <span className="badge badge-warn">دارای بخش نامطمئن — نیازمند تأیید</span>}
                {s.type === "image" && !s.text && <span className="badge badge-danger">متن استخراج نشد؛ دستی وارد کنید</span>}
                <span className="flex-1" />
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === 0} onClick={() => { const a = [...sources]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setSrc(a); }} aria-label="بالا"><ArrowUp size={15} /></button>
                <button className="btn btn-ghost btn-icon btn-sm" disabled={i === sources.length - 1} onClick={() => { const a = [...sources]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; setSrc(a); }} aria-label="پایین"><ArrowDown size={15} /></button>
                <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => setSrc(sources.filter((x) => x.id !== s.id))} aria-label="حذف منبع"><Trash2 size={15} /></button>
              </div>
              <div className={s.type === "image" && previews[s.id] ? "grid gap-3 md:grid-cols-[180px_1fr]" : ""}>
                {s.type === "image" && previews[s.id] && /* eslint-disable-next-line @next/next/no-img-element */ <img src={previews[s.id]} alt={s.name} className="max-h-48 w-full rounded-xl object-contain" />}
                <textarea className="input" rows={6} value={s.text} readOnly={readOnly} onChange={(e) => setSrc(sources.map((x) => (x.id === s.id ? { ...x, text: e.target.value, uncertain: e.target.value.includes("[؟") } : x)))} aria-label={`متن ${s.name}`} />
              </div>
              <div className="mt-2"><button className="btn btn-sm" onClick={() => setSrc(sources.map((x) => (x.id === s.id ? { ...x, text: normalizeFa(x.text) } : x)))} disabled={readOnly}><Eraser size={15} />اصلاح نیم‌فاصله و نویسه‌ها</button></div>
            </div>
          ))}
          <div className="flex justify-between"><button className="btn" onClick={() => setStep(0)}>قبلی</button><button className="btn btn-primary" onClick={() => setStep(2)}>مرحله بعد</button></div>
        </section>
      )}

      {step === 2 && (
        <section className="glass-solid grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="label" htmlFor="nbt">عنوان نکته‌نامه</label><input id="nbt" className="input" value={title} onChange={(e) => { setTitle(e.target.value); mark(); }} readOnly={readOnly} /></div>
          <div><label className="label" htmlFor="nbs">درس</label><select id="nbs" className="input" value={subjectId ?? ""} disabled={readOnly} onChange={(e) => { setSubjectId(e.target.value ? Number(e.target.value) : null); mark(); }}><option value="">— انتخاب درس —</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="label">استاد</label><div className="input flex items-center">{subject?.teacher ?? <span className="text-faint">ثبت نشده</span>}</div></div>
          <div className="sm:col-span-2"><span className="label">سبک نکته‌نامه</span><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{STYLES.map(([k, l]) => <button key={k} type="button" className="choice" aria-pressed={style === k} disabled={readOnly} onClick={() => { setStyle(k); mark(); }}><span className="mark"><Check size={14} /></span>{l}</button>)}</div></div>
          <div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2">
            <button className="btn" onClick={() => setStep(1)}>قبلی</button>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => ai("build", true)} disabled={!!busy || !sources.length || readOnly}>{busy === "ai-build" ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}ساخت با هوش مصنوعی</button>
              <button className="btn" disabled={readOnly || !sources.length} onClick={() => { if (!content.trim() || confirm("متن فعلی جایگزین شود؟")) { edit(sources.map((s) => s.text).join("\n\n")); setStep(3); } }}>انتقال مستقیم متن‌ها به ویرایشگر</button>
            </div>
          </div>
          {aiNote && <div className="badge badge-info !rounded-xl !px-3 !py-2 sm:col-span-2"><Loader2 size={15} className="spin" />{aiNote}</div>}
          <p className="hint m-0 sm:col-span-2">هوش مصنوعی فقط ویراستار است: مفاهیم، اعداد و فرمول‌ها را تغییر نمی‌دهد و محتوای افزوده را جدا (سبز) مشخص می‌کند.</p>
        </section>
      )}

      {step === 3 && (
        <section className="grid gap-3">
          <div className="glass flex flex-wrap items-center gap-1 p-2">
            <Tool onClick={() => linePrefix("# ")} label="تیتر ۱"><Heading1 size={17} /></Tool><Tool onClick={() => linePrefix("## ")} label="تیتر ۲"><Heading2 size={17} /></Tool><Tool onClick={() => linePrefix("### ")} label="تیتر ۳"><Heading3 size={17} /></Tool>
            <Tool onClick={() => wrap("**")} label="پررنگ"><Bold size={17} /></Tool><Tool onClick={() => wrap("*")} label="مورب"><Italic size={17} /></Tool>
            <Tool onClick={() => linePrefix("- ")} label="فهرست"><List size={17} /></Tool><Tool onClick={() => linePrefix("1. ")} label="فهرست شماره‌دار"><ListOrdered size={17} /></Tool><Tool onClick={() => linePrefix("> ")} label="نقل‌قول"><Quote size={17} /></Tool>
            <Tool onClick={() => insertAt("\n\n| ستون ۱ | ستون ۲ |\n| --- | --- |\n| داده | داده |\n\n")} label="جدول"><Table2 size={17} /></Tool>
            <span className="mx-1 h-6 w-px bg-[var(--glass-border)]" />
            <Tool onClick={undo} label="بازگرداندن (Undo)"><Undo2 size={17} /></Tool><Tool onClick={redo} label="ازنو (Redo)"><Redo2 size={17} /></Tool>
            <Tool onClick={() => edit(normalizeFa(content))} label="اصلاح نیم‌فاصله و نویسه‌ها"><Eraser size={17} /></Tool>
            <span className="flex-1" />
            <button className="btn btn-sm md:hidden" onClick={() => setShowPrev(!showPrev)}>{showPrev ? "ویرایش" : "پیش‌نمایش"}</button>
          </div>
          <div className="glass-2 flex flex-wrap items-center gap-2 p-2 text-sm"><Sparkles size={16} className="text-brand" /><span className="font-bold">ویراستار هوشمند</span><span className="hint">(روی متن انتخاب‌شده یا کل متن؛ بخش‌های دیگر دست‌نخورده می‌مانند)</span>
            {[["fix", "اصلاح املا و نگارش"], ["organize", "مرتب‌سازی"], ["simplify", "ساده‌سازی"], ["summarize", "خلاصه"], ["title", "پیشنهاد عنوان"], ["ambiguity", "بررسی ابهام"]].map(([m, l]) => <button key={m} className="btn btn-sm" disabled={!!busy || readOnly} onClick={() => ai(m)}>{busy === `ai-${m}` && <Loader2 size={14} className="spin" />}{l}</button>)}
          </div>
          {aiNote && <div className="glass-solid whitespace-pre-line p-3 text-sm">{aiNote}</div>}
          <div className="grid gap-3 md:grid-cols-2">
            <textarea ref={taRef} dir="rtl" className={`input min-h-[420px] font-[inherit] ${showPrev ? "hidden md:block" : ""}`} value={content} readOnly={readOnly} onChange={(e) => edit(e.target.value, false)} onBlur={() => pushHist(content)} placeholder="متن نکته‌نامه (Markdown ساده)…" aria-label="ویرایشگر متن" />
            <div className={`glass-solid min-h-[420px] overflow-y-auto p-5 ${showPrev ? "" : "hidden md:block"}`}><MarkdownView text={content} /></div>
          </div>
          <div className="flex justify-between"><button className="btn" onClick={() => setStep(2)}>قبلی</button><button className="btn btn-primary" onClick={() => setStep(4)}>مرحله بعد</button></div>
        </section>
      )}

      {step === 4 && (
        <section className="glass-solid grid gap-4 p-5">
          <div className="flex flex-wrap items-center gap-2"><span className="font-bold">وضعیت:</span><span className={status === "published" ? "badge badge-ok" : status === "pending" ? "badge badge-warn" : status === "failed" ? "badge badge-danger" : "badge"}>{STATUS_FA[status]}</span>{nb.statusNote && status === "failed" && <span className="text-sm text-muted">{nb.statusNote}</span>}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={makeDocx} disabled={busy === "docx" || !content.trim()}>{busy === "docx" ? <Loader2 size={17} className="spin" /> : <FileDown size={17} />}ساخت فایل DOCX</button>
            {(docxUrl || nb.hasDocx) && <a className="btn" href={docxUrl ?? `/api/notebooks/${nb.id}/download`} download><FileDown size={17} />دانلود DOCX</a>}
            <button className="btn" onClick={save} disabled={readOnly}>ذخیره در حساب من</button>
          </div>
          <hr className="w-full border-[var(--glass-border)]" />
          <div className="text-sm text-muted">برای انتشار در سایت یا کانال بله، درخواست انتشار ثبت کنید. انتشار فقط پس از بررسی و تأیید مدیر انجام می‌شود.</div>
          <div className="flex flex-wrap gap-2">
            {(status === "draft" || status === "failed") && <button className="btn btn-primary" onClick={() => action("request")} disabled={!!busy || !content.trim()}>{busy === "request" ? <Loader2 size={17} className="spin" /> : <Send size={17} />}درخواست انتشار</button>}
            {status === "pending" && <button className="btn" onClick={() => action("withdraw")} disabled={!!busy}>بازپس‌گیری درخواست</button>}
            <button className="btn btn-danger" onClick={remove}><Trash2 size={16} />حذف نکته‌نامه</button>
          </div>
          <div className="flex justify-start"><button className="btn" onClick={() => setStep(3)}>بازگشت به ویرایش</button></div>
        </section>
      )}
    </div>
  );
}
