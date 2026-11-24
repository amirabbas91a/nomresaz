"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, Copy, Loader2, Pencil, Plus, Search, Send, ShieldAlert, Trash2, Wrench, X, PanelRight } from "lucide-react";
import { MarkdownView } from "./MarkdownView";
import { useToast } from "./Toast";

type Pending = { callId: string; tool: string; summary: string; state: "pending" | "done" | "rejected" | "failed"; result?: string };
type Msg = { id: string; role: "user" | "assistant"; content: string; tools?: { name: string; ok: boolean; summary: string }[] | null; pending?: Pending[] | null };
type Conv = { id: string; title: string };

export function Assistant({ configured }: { configured: boolean }) {
  const toast = useToast();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [q, setQ] = useState("");
  const [cur, setCur] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [side, setSide] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async (s = "") => {
    const r = await fetch(`/api/ai/conversations${s ? `?q=${encodeURIComponent(s)}` : ""}`);
    if (r.ok) setConvs((await r.json()).rows);
  }, []);
  useEffect(() => { // eslint-disable-next-line react-hooks/set-state-in-effect
    loadList(); }, [loadList]);
  useEffect(() => { const t = setTimeout(() => loadList(q), 250); return () => clearTimeout(t); }, [q, loadList]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function open(id: string) {
    setCur(id); setSide(false); setErr("");
    const r = await fetch(`/api/ai/conversations/${id}`);
    if (r.ok) setMsgs((await r.json()).messages);
  }
  async function send(text: string, editMessageId?: string) {
    if (!text.trim() || busy) return;
    setBusy(true); setErr("");
    const tmp: Msg = { id: `tmp-${Date.now()}`, role: "user", content: text };
    setMsgs((m) => (editMessageId ? [...m.slice(0, m.findIndex((x) => x.id === editMessageId)), tmp] : [...m, tmp]));
    setInput(""); setEditing(null);
    const r = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: cur ?? undefined, message: text, editMessageId }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(j.error ?? "خطا در ارتباط با دستیار"); return; }
    if (!cur) setCur(j.conversationId);
    await open(j.conversationId); loadList(q);
  }
  async function decide(messageId: string, callId: string, approve: boolean) {
    const r = await fetch("/api/ai/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, callId, approve }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return toast("error", j.error ?? "خطا");
    setMsgs((ms) => ms.map((m) => (m.id === messageId ? { ...m, pending: m.pending?.map((p) => (p.callId === callId ? j.action : p)) } : m)));
    toast(j.action.state === "done" ? "ok" : j.action.state === "failed" ? "error" : "info", j.action.result ?? "ثبت شد");
  }
  async function rename(id: string, title: string) {
    await fetch(`/api/ai/conversations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    setRenaming(null); loadList(q);
  }
  async function del(id: string) {
    if (!confirm("این گفت‌وگو حذف شود؟")) return;
    await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
    if (cur === id) { setCur(null); setMsgs([]); }
    loadList(q);
  }

  if (!configured) {
    return (
      <div className="glass mx-auto max-w-xl p-8 text-center"><ShieldAlert className="mx-auto text-warn" size={38} /><h2 className="font-extrabold">پیکربندی نشده</h2>
        <p className="m-0 text-sm text-muted">کلید سرویس هوش مصنوعی روی سرور تنظیم نشده است. متغیر محیطی <b className="ltr">OPENAI_API_KEY</b> را در تنظیمات استقرار (Vercel → Environment Variables) اضافه و دوباره استقرار دهید. تا آن زمان دستیار غیرفعال است.</p></div>
    );
  }

  const list = (
    <div className="flex h-full flex-col gap-2 p-3">
      <button className="btn btn-primary" onClick={() => { setCur(null); setMsgs([]); setSide(false); }}><Plus size={17} />گفت‌وگوی جدید</button>
      <div className="relative"><Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" /><input className="input !min-h-[38px] !ps-9" placeholder="جست‌وجو…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جست‌وجوی گفت‌وگوها" /></div>
      <ul className="m-0 flex-1 list-none overflow-y-auto p-0">
        {convs.map((c) => (
          <li key={c.id} className={`group flex items-center gap-1 rounded-xl px-2 py-1 ${cur === c.id ? "bg-[var(--brand-soft)]" : "hover:bg-[var(--glass-bg-2)]"}`}>
            {renaming === c.id ? <input autoFocus className="input !min-h-[34px]" defaultValue={c.title} onBlur={(e) => rename(c.id, e.target.value || c.title)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} aria-label="نام جدید" />
              : <button className="min-w-0 flex-1 truncate py-1.5 text-start text-sm font-semibold" onClick={() => open(c.id)}>{c.title}</button>}
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRenaming(c.id)} aria-label="تغییر نام"><Pencil size={14} /></button>
            <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => del(c.id)} aria-label="حذف"><Trash2 size={14} /></button>
          </li>
        ))}
        {convs.length === 0 && <li className="p-4 text-center text-xs text-faint">گفت‌وگویی ثبت نشده</li>}
      </ul>
    </div>
  );

  return (
    <div className="grid h-[calc(100dvh-170px)] min-h-[480px] gap-4 md:grid-cols-[280px_1fr]">
      <aside className="glass-solid hidden overflow-hidden md:block">{list}</aside>
      {side && <div className="fixed inset-0 z-[65] md:hidden" style={{ background: "rgba(5,12,36,.5)" }} onClick={() => setSide(false)}><div className="glass-float h-full w-[300px] max-w-[85vw]" onClick={(e) => e.stopPropagation()}>{list}</div></div>}
      <section className="glass-solid flex min-h-0 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--glass-border)] px-4 py-3"><button className="btn btn-ghost btn-icon btn-sm md:hidden" onClick={() => setSide(true)} aria-label="گفت‌وگوها"><PanelRight size={18} /></button><Bot size={20} className="text-brand" /><span className="font-extrabold">ChatGPT - نمره‌ساز</span><span className="badge badge-ok ms-auto">متصل</span></div>
        <div className="flex-1 overflow-y-auto p-4" aria-live="polite">
          {msgs.length === 0 && !busy && (
            <div className="grid h-full place-items-center text-center"><div><span className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-[var(--brand-soft)] text-brand"><Bot size={30} /></span><p className="font-bold">چطور می‌توانم کمک کنم؟</p>
              <div className="flex flex-wrap justify-center gap-2">{["آمار فعلی سایت را بده", "یک پیش‌نویس آزمون ۵ سؤالی از فتوسنتز بساز", "پیش‌نویس اطلاعیه شروع هفته امتحانات بنویس"].map((s) => <button key={s} className="chip" onClick={() => send(s)}>{s}</button>)}</div></div></div>
          )}
          <div className="mx-auto grid max-w-3xl gap-4">
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-start"}`}>
                <div className={`w-full rounded-2xl p-4 ${m.role === "user" ? "bg-[var(--brand-soft)]" : "glass-2"}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs font-bold text-muted">{m.role === "user" ? "شما" : <><Bot size={14} />دستیار</>}
                    <span className="flex-1" />
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { navigator.clipboard.writeText(m.content); toast("ok", "کپی شد."); }} aria-label="کپی"><Copy size={14} /></button>
                    {m.role === "user" && !m.id.startsWith("tmp") && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditing(m.id); setInput(m.content); }} aria-label="ویرایش و ارسال مجدد"><Pencil size={14} /></button>}
                  </div>
                  {m.role === "user" ? <p className="m-0 whitespace-pre-line">{m.content}</p> : <MarkdownView text={m.content} />}
                  {m.tools?.map((t, i) => <div key={i} className={`badge mt-2 me-1 ${t.ok ? "badge-ok" : "badge-danger"}`}><Wrench size={12} />{t.summary}</div>)}
                  {m.pending?.map((p) => (
                    <div key={p.callId} className="mt-3 rounded-xl border border-[var(--glass-border)] bg-[var(--warn-bg)] p-3 text-sm">
                      <div className="mb-1 flex items-center gap-2 font-bold text-warn"><ShieldAlert size={16} />عملیات حساس — نیازمند تأیید</div>
                      <div>{p.summary}</div>
                      {p.state === "pending" ? <div className="mt-2 flex gap-2"><button className="btn btn-sm btn-primary" onClick={() => decide(m.id, p.callId, true)}><Check size={15} />تأیید و اجرا</button><button className="btn btn-sm" onClick={() => decide(m.id, p.callId, false)}><X size={15} />رد</button></div>
                        : <div className={`badge mt-2 ${p.state === "done" ? "badge-ok" : p.state === "failed" ? "badge-danger" : ""}`}>{p.state === "done" ? "اجرا شد" : p.state === "failed" ? "ناموفق" : "رد شد"}: {p.result}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {busy && <div className="glass-2 flex items-center gap-3 rounded-2xl p-4 text-sm"><Loader2 size={17} className="spin text-brand" />دستیار در حال بررسی و اجرای ابزارها…</div>}
            {err && <div role="alert" className="badge badge-danger !rounded-xl !px-3 !py-2 text-sm">{err}</div>}
            <div ref={endRef} />
          </div>
        </div>
        <form className="border-t border-[var(--glass-border)] p-3" onSubmit={(e) => { e.preventDefault(); send(input, editing ?? undefined); }}>
          {editing && <div className="mb-2 flex items-center gap-2 text-xs text-warn">در حال ویرایش پیام؛ پیام‌های بعد از آن حذف و دوباره پردازش می‌شوند.<button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(null); setInput(""); }}>انصراف</button></div>}
          <div className="flex items-end gap-2"><textarea className="input max-h-40 flex-1" rows={2} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input, editing ?? undefined); } }} placeholder="پیام خود را بنویسید… (Enter برای ارسال)" aria-label="پیام" maxLength={6000} />
            <button className="btn btn-primary btn-icon" disabled={busy || !input.trim()} aria-label="ارسال">{busy ? <Loader2 size={18} className="spin" /> : <Send size={18} />}</button></div>
        </form>
      </section>
    </div>
  );
}
