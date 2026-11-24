"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Monitor, Plus, Save, Smartphone, Trash2 } from "lucide-react";
import { PageBlocks } from "./PageBlocks";
import { useToast } from "./Toast";
import { uid } from "@/lib/utils";
import type { PageBlock } from "@/db/schema";

const TYPES: Record<string, string> = { hero: "سربرگ", text: "متن", image: "تصویر", list: "فهرست", cta: "دعوت به اقدام" };

export function PageEditor({ id, slug, initial }: { id: number; slug: string; initial: { title: string; blocks: PageBlock[]; status: "draft" | "published" } }) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(initial.title);
  const [blocks, setBlocks] = useState(initial.blocks);
  const [status, setStatus] = useState(initial.status);
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const setB = (i: number, p: Partial<PageBlock>) => setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const move = (i: number, d: number) => setBlocks((bs) => { const a = [...bs]; const j = i + d; if (j < 0 || j >= a.length) return bs; [a[i], a[j]] = [a[j], a[i]]; return a; });

  async function save(next: "draft" | "published") {
    if (next === "published" && status !== "published" && !confirm("این صفحه برای عموم منتشر شود؟")) return;
    setBusy(true);
    const r = await fetch(`/api/pages/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, blocks, status: next, confirmPublish: next === "published" }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast("error", j.error ?? "ذخیره ناموفق بود");
    setStatus(next); toast("ok", next === "published" ? "منتشر شد." : "ذخیره شد."); router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="grid content-start gap-3">
        <div className="glass-solid p-4"><label className="label" htmlFor="pgt">عنوان صفحه</label><input id="pgt" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /><div className="hint mt-1 ltr text-left">/p/{slug}</div></div>
        {blocks.map((b, i) => (
          <div key={b.id} className="glass-solid grid gap-2 p-4">
            <div className="flex items-center gap-2"><span className="badge badge-info">{TYPES[b.type]}</span><span className="flex-1" />
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, -1)} aria-label="بالا"><ArrowUp size={15} /></button><button className="btn btn-ghost btn-icon btn-sm" onClick={() => move(i, 1)} aria-label="پایین"><ArrowDown size={15} /></button>
              <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))} aria-label="حذف بلوک"><Trash2 size={15} /></button></div>
            {b.type !== "image" && <input className="input" placeholder="عنوان" value={b.title ?? ""} onChange={(e) => setB(i, { title: e.target.value })} aria-label="عنوان بلوک" />}
            {b.type !== "list" && <textarea className="input" rows={3} placeholder={b.type === "image" ? "توضیح تصویر" : "متن"} value={b.text ?? ""} onChange={(e) => setB(i, { text: e.target.value })} aria-label="متن بلوک" />}
            {b.type === "image" && <input className="input ltr text-left" placeholder="نشانی تصویر (https://… یا /api/files/…)" value={b.imageUrl ?? ""} onChange={(e) => setB(i, { imageUrl: e.target.value })} aria-label="نشانی تصویر" />}
            {b.type === "list" && <textarea className="input" rows={4} placeholder="هر مورد در یک خط" value={(b.items ?? []).join("\n")} onChange={(e) => setB(i, { items: e.target.value.split("\n").filter((x) => x.trim()) })} aria-label="موارد فهرست" />}
            {b.type === "cta" && <div className="grid gap-2 sm:grid-cols-2"><input className="input" placeholder="متن دکمه" value={b.buttonLabel ?? ""} onChange={(e) => setB(i, { buttonLabel: e.target.value })} aria-label="متن دکمه" /><input className="input ltr text-left" placeholder="پیوند" value={b.buttonUrl ?? ""} onChange={(e) => setB(i, { buttonUrl: e.target.value })} aria-label="پیوند دکمه" /></div>}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">{Object.entries(TYPES).map(([k, l]) => <button key={k} className="btn btn-sm" onClick={() => setBlocks([...blocks, { id: uid(), type: k as PageBlock["type"] }])}><Plus size={15} />{l}</button>)}</div>
        <div className="glass-float !sticky bottom-20 z-10 flex flex-wrap items-center gap-2 p-3 md:bottom-4"><span className={status === "published" ? "badge badge-ok" : "badge"}>{status === "published" ? "منتشرشده" : "پیش‌نویس"}</span><span className="flex-1" />
          <button className="btn" onClick={() => save(status)} disabled={busy}>{busy ? <Loader2 size={16} className="spin" /> : <Save size={16} />}ذخیره</button>
          {status === "published" ? <button className="btn" onClick={() => save("draft")} disabled={busy}>لغو انتشار</button> : <button className="btn btn-primary" onClick={() => save("published")} disabled={busy}>انتشار</button>}</div>
      </div>
      <div>
        <div className="mb-2 flex gap-2"><button className="chip" aria-pressed={!mobile} onClick={() => setMobile(false)}><Monitor size={15} className="me-2" />دسکتاپ</button><button className="chip" aria-pressed={mobile} onClick={() => setMobile(true)}><Smartphone size={15} className="me-2" />موبایل</button></div>
        <div className="glass-2 overflow-auto p-4"><div className={`mx-auto transition-all ${mobile ? "max-w-[375px]" : "max-w-full"}`}><PageBlocks blocks={blocks} /></div></div>
      </div>
    </div>
  );
}
