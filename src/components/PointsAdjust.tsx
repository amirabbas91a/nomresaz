"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "./Toast";

export function PointsAdjust({ users }: { users: { id: string; name: string }[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    const r = await fetch("/api/admin/points", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: fd.get("userId"), points: Number(fd.get("points")), reason: fd.get("reason") }) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "امتیاز ثبت شد."); (e.target as HTMLFormElement).reset(); router.refresh();
  }
  return (
    <form onSubmit={submit} className="glass-solid grid gap-3 p-5 sm:grid-cols-[1.4fr_120px_2fr_auto] sm:items-end">
      <div><label className="label" htmlFor="pu">دانش‌آموز</label><select id="pu" name="userId" className="input" required>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
      <div><label className="label" htmlFor="pp">امتیاز (±)</label><input id="pp" name="points" type="number" className="input" required /></div>
      <div><label className="label" htmlFor="pr">دلیل (الزامی)</label><input id="pr" name="reason" className="input" required minLength={3} /></div>
      <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ثبت</button>
    </form>
  );
}
