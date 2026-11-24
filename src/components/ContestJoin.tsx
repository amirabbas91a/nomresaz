"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "./Toast";

export function ContestJoin({ id }: { id: number }) {
  const router = useRouter();
  const toast = useToast();
  const [ans, setAns] = useState("");
  const [busy, setBusy] = useState(false);
  async function join() {
    setBusy(true);
    const r = await fetch(`/api/contests/${id}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer: ans }) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "ثبت‌نام و پاسخ شما ثبت شد."); router.refresh();
  }
  return (
    <div className="mt-3 grid gap-2"><textarea className="input" rows={3} placeholder="پاسخ یا توضیح شما (اختیاری)" value={ans} onChange={(e) => setAns(e.target.value)} aria-label="پاسخ مسابقه" /><button className="btn btn-primary w-fit" onClick={join} disabled={busy}>{busy && <Loader2 size={17} className="spin" />}شرکت در مسابقه</button></div>
  );
}
