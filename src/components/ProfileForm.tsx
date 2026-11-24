"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "./Toast";

export function ProfileForm({ name, visible }: { name: string; visible: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [vis, setVis] = useState(visible);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { name: fd.get("name"), leaderboardVisible: vis };
    if (fd.get("newPassword")) { body.newPassword = fd.get("newPassword"); body.currentPassword = fd.get("currentPassword"); }
    setBusy(true);
    const r = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "ذخیره شد."); router.refresh();
  }
  return (
    <form onSubmit={submit} className="glass-solid grid gap-4 p-6">
      <div><label className="label" htmlFor="pn">نام</label><input id="pn" name="name" className="input" defaultValue={name} required minLength={2} /></div>
      <div className="flex items-center gap-3"><button type="button" role="switch" aria-checked={vis} id="pv" className="switch" onClick={() => setVis(!vis)} /><label htmlFor="pv" className="text-sm font-semibold">نمایش نام من در جدول رتبه‌بندی</label></div>
      <hr className="w-full border-[var(--glass-border)]" />
      <div className="text-sm font-bold">تغییر رمز عبور (اختیاری)</div>
      <div><label className="label" htmlFor="cp">رمز فعلی</label><input id="cp" name="currentPassword" type="password" dir="ltr" className="input ltr text-left" autoComplete="current-password" /></div>
      <div><label className="label" htmlFor="np">رمز جدید</label><input id="np" name="newPassword" type="password" dir="ltr" className="input ltr text-left" autoComplete="new-password" /></div>
      <button className="btn btn-primary w-fit" disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ذخیره</button>
    </form>
  );
}
