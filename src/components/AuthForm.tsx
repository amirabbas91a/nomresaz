"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Lock, Mail, User } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reg = mode === "register";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const body = Object.fromEntries(fd.entries());
    try {
      const r = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "خطا در ارتباط با سرور");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      {reg && (
        <div>
          <label className="label" htmlFor="name">نام و نام خانوادگی</label>
          <div className="relative">
            <User size={17} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-faint" />
            <input id="name" name="name" className="input !pe-10 !ps-3" autoComplete="name" required />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">ایمیل</label>
        <div className="relative">
          <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input id="email" name="email" type="email" dir="ltr" className="input ltr !ps-10 !pe-3 text-left" autoComplete="email" placeholder="example@domain.com" required />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">رمز عبور</label>
        <div className="relative">
          <Lock size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input id="password" name="password" type="password" dir="ltr" className="input ltr !ps-10 !pe-3 text-left" autoComplete={reg ? "new-password" : "current-password"} required />
        </div>
        {reg && <p className="hint m-0 mt-1">حداقل ۸ نویسه، ترکیبی از حرف و عدد.</p>}
      </div>
      {error && <div role="alert" className="badge badge-danger !rounded-xl !px-3 !py-2 text-sm">{error}</div>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy && <Loader2 size={18} className="spin" />}
        {reg ? "ساخت حساب" : "ورود"}
      </button>
      <p className="m-0 text-center text-sm text-muted">
        {reg ? "حساب دارید؟ " : "حساب ندارید؟ "}
        <Link href={reg ? "/login" : "/register"} className="font-bold text-brand">{reg ? "وارد شوید" : "ثبت‌نام کنید"}</Link>
      </p>
    </form>
  );
}
