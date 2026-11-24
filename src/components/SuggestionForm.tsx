"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "./Toast";

export function SuggestionForm() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [anon, setAnon] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    const r = await fetch("/api/suggestions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: fd.get("category"), body: fd.get("body"), anonymous: anon }) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "ارسال شد. سپاس از همراهی شما!"); form.reset(); router.refresh();
  }
  return (
    <form onSubmit={submit} className="glass-solid grid gap-4 p-5">
      <div><label className="label" htmlFor="sc">دسته</label><select id="sc" name="category" className="input"><option value="suggestion">پیشنهاد</option><option value="bug">گزارش مشکل</option><option value="content">محتوا</option></select></div>
      <div><label className="label" htmlFor="sb">متن</label><textarea id="sb" name="body" className="input" rows={5} required minLength={5} maxLength={3000} /></div>
      <div className="flex items-center gap-3"><button type="button" role="switch" aria-checked={anon} id="san" className="switch" onClick={() => setAnon(!anon)} /><label htmlFor="san" className="text-sm font-semibold">ارسال ناشناس (پاسخ مدیر برای شما نمایش داده نمی‌شود)</label></div>
      <button className="btn btn-primary w-fit" disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ارسال</button>
    </form>
  );
}
