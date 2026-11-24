"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "./Toast";

type Section = { key: string; title: string; visible: boolean };

export function AppearanceForm({ site, sections: init, baleUrl }: { site: { siteName: string; tagline: string; heroTitle: string; heroText: string }; sections: Section[]; baleUrl: string }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(site);
  const [bale, setBale] = useState(baleUrl);
  const [secs, setSecs] = useState(init);
  const [busy, setBusy] = useState(false);
  const move = (i: number, d: number) => setSecs((a) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });
  async function save() {
    setBusy(true);
    const r = await fetch("/api/admin/appearance", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ site: s, baleUrl: bale, sections: secs }) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "ذخیره شد."); router.refresh();
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="glass-solid grid content-start gap-4 p-5">
        <h2 className="m-0 text-lg font-extrabold">هویت و بخش اصلی</h2>
        {([["siteName", "نام سایت"], ["tagline", "شعار"], ["heroTitle", "تیتر صفحه اصلی"]] as const).map(([k, l]) => <div key={k}><label className="label" htmlFor={k}>{l}</label><input id={k} className="input" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>)}
        <div><label className="label" htmlFor="ht">متن معرفی</label><textarea id="ht" className="input" rows={3} value={s.heroText} onChange={(e) => setS({ ...s, heroText: e.target.value })} /></div>
        <div><label className="label" htmlFor="bu">پیوند کانال بله</label><input id="bu" className="input ltr text-left" value={bale} onChange={(e) => setBale(e.target.value)} /></div>
      </section>
      <section className="glass-solid p-5">
        <h2 className="mt-0 text-lg font-extrabold">بخش‌های صفحه اصلی</h2>
        <p className="mt-0 text-sm text-muted">ترتیب، عنوان و نمایش هر بخش را تنظیم کنید. بخش‌های بدون محتوا به‌طور خودکار نمایش داده نمی‌شوند.</p>
        <div className="grid gap-2">{secs.map((x, i) => (
          <div key={x.key} className={`flex items-center gap-2 rounded-xl border border-[var(--glass-border)] p-2 ${x.visible ? "" : "opacity-60"}`}>
            <input className="input !min-h-[38px]" value={x.title} onChange={(e) => setSecs(secs.map((y, j) => (j === i ? { ...y, title: e.target.value } : y)))} aria-label={`عنوان بخش ${x.key}`} />
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSecs(secs.map((y, j) => (j === i ? { ...y, visible: !y.visible } : y)))} aria-label={x.visible ? "پنهان‌کردن" : "نمایش"}>{x.visible ? <Eye size={16} /> : <EyeOff size={16} />}</button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, -1)} aria-label="بالا"><ArrowUp size={16} /></button><button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, 1)} aria-label="پایین"><ArrowDown size={16} /></button>
          </div>))}</div>
      </section>
      <div className="lg:col-span-2"><button className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ذخیره تغییرات</button></div>
    </div>
  );
}
