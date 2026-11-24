"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "./Toast";

type F = { key: string; label: string; description: string; status: string; statusLabel: string; togglable: boolean; enabled: boolean };
type S = { key: string; label: string; detail: string; stateLabel: string; cls: string; testable: boolean };

export function FeaturesCenter({ features, services }: { features: F[]; services: S[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  async function toggle(f: F) {
    if (f.enabled && !confirm(`قابلیت «${f.label}» غیرفعال شود؟ منو، صفحه و API آن بسته می‌شود (داده‌ها حذف نمی‌شوند).`)) return;
    setBusy(f.key);
    const r = await fetch("/api/admin/features", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: f.key, enabled: !f.enabled }) });
    setBusy(null);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "اعمال شد."); router.refresh();
  }
  async function test(key: string) {
    setBusy(`t-${key}`);
    const r = await fetch("/api/admin/services/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    toast(r.ok && j.ok ? "ok" : "error", r.ok ? (j.ok ? "اتصال موفق بود." : j.msg ?? "اتصال ناموفق") : j.error ?? "خطا");
    router.refresh();
  }
  const tone = (s: string) => (s === "active" ? "badge badge-ok" : s === "needs_service" ? "badge badge-info" : "badge badge-warn");
  return (
    <div className="grid gap-8">
      <section><h2 className="mb-3 text-lg font-extrabold">سرویس‌های خارجی و زیرساخت</h2>
        <div className="grid gap-3 md:grid-cols-2">{services.map((s) => (
          <div key={s.key} className="glass-solid p-4"><div className="flex items-start justify-between gap-2"><div className="font-bold">{s.label}</div><span className={`${s.cls} flex-none`}>{s.stateLabel}</span></div><p className="mb-0 mt-1 text-sm text-muted">{s.detail}</p>
            {s.testable && <button className="btn btn-sm mt-3" onClick={() => test(s.key)} disabled={busy === `t-${s.key}`}>{busy === `t-${s.key}` && <Loader2 size={14} className="spin" />}آزمایش اتصال</button>}</div>
        ))}</div></section>
      <section><h2 className="mb-3 text-lg font-extrabold">قابلیت‌ها</h2>
        <div className="grid gap-3 md:grid-cols-2">{features.map((f) => (
          <div key={f.key} className="glass-solid flex items-start gap-3 p-4"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold">{f.label}</span><span className={tone(f.status)}>{f.statusLabel}</span>{f.togglable && !f.enabled && <span className="badge badge-danger">غیرفعال</span>}</div><p className="mb-0 mt-1 text-sm text-muted">{f.description}</p></div>
            {f.togglable ? <button className="switch mt-1" role="switch" aria-checked={f.enabled} aria-label={`فعال بودن ${f.label}`} onClick={() => toggle(f)} disabled={busy === f.key} /> : <span className="badge flex-none">بدون کنترل</span>}</div>
        ))}</div></section>
    </div>
  );
}
