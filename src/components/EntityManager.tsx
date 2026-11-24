"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { JalaliDateInput } from "./JalaliDateInput";
import { Empty, StatusBadge } from "./ui";
import type { EntityMeta, Field } from "@/lib/entity-meta";
import { fa, formatJalali } from "@/lib/jalali";

type Row = Record<string, unknown> & { id: number };
type Subject = { id: number; name: string };

export function EntityManager({ meta }: { meta: EntityMeta }) {
  const toast = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/crud/${meta.key}`);
    if (!r.ok) {
      setError((await r.json().catch(() => ({}))).error ?? "خطا در بارگذاری");
      setRows([]);
      return;
    }
    const j = await r.json();
    setRows(j.rows);
    setSubjects(j.subjects);
  }, [meta.key]);

  useEffect(() => {
    load();
  }, [load]);

  const cols = meta.fields.filter((f) => f.table);
  const filtered = useMemo(() => {
    if (!rows) return null;
    const s = q.trim();
    if (!s) return rows;
    return rows.filter((r) => meta.fields.some((f) => typeof r[f.key] === "string" && (r[f.key] as string).includes(s)));
  }, [rows, q, meta.fields]);

  function cell(f: Field, r: Row) {
    const v = r[f.key];
    if (v === null || v === undefined || v === "") return <span className="text-faint">—</span>;
    if (f.key === "status") return <StatusBadge status={String(v)} />;
    if (f.type === "boolean") return v ? <span className="badge badge-ok">بله</span> : <span className="badge">خیر</span>;
    if (f.type === "date" || f.type === "datetime") return <span>{formatJalali(String(v), f.type === "datetime")}</span>;
    if (f.type === "select") return <span>{f.options?.find((o) => o.value === v)?.label ?? String(v)}</span>;
    if (f.type === "subject") return <span>{subjects.find((s) => s.id === v)?.name ?? "—"}</span>;
    if (f.type === "file") return <a className="inline-flex items-center gap-1 text-brand" href={`/api/files/${v}?dl=1`}><Download size={15} />دانلود</a>;
    if (f.type === "number") return <span>{fa(String(v))}</span>;
    return <span className="line-clamp-2 max-w-[320px]">{String(v)}</span>;
  }

  async function remove() {
    if (!deleting) return;
    const r = await fetch(`/api/crud/${meta.key}/${deleting.id}`, { method: "DELETE" });
    if (r.ok) { toast("ok", "حذف شد."); setDeleting(null); load(); } else toast("error", (await r.json()).error ?? "خطا در حذف");
  }

  const closeEditing = useCallback(() => setEditing(null), []);
  const onSaved = useCallback(() => { setEditing(null); load(); }, [load]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search size={17} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
          <input className="input !ps-10" placeholder="جست‌وجو در فهرست…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="جست‌وجو" />
        </div>
        <div className="flex-1" />
        {meta.canCreate !== false && <button className="btn btn-primary" onClick={() => setEditing("new")}><Plus size={18} />{meta.singular} جدید</button>}
      </div>

      {error && <div className="badge badge-danger mb-3 !rounded-xl !px-3 !py-2">{error}</div>}
      {filtered === null ? (
        <div className="grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-14" />)}</div>
      ) : filtered.length === 0 ? (
        <Empty title={q ? "نتیجه‌ای یافت نشد" : "داده‌ای ثبت نشده"} text={q ? "عبارت دیگری را جست‌وجو کنید." : `هنوز ${meta.singular}ی ثبت نشده است.`} />
      ) : (
        <div className="glass-solid tbl-wrap">
          <table className="tbl">
            <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}<th className="w-28">عملیات</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  {cols.map((c) => <td key={c.key}>{cell(c, r)}</td>)}
                  <td>
                    <div className="flex gap-1">
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(r)} aria-label="ویرایش"><Pencil size={16} /></button>
                      {meta.canCreate !== false && <button className="btn btn-ghost btn-icon btn-sm text-danger" onClick={() => setDeleting(r)} aria-label="حذف"><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EntityForm meta={meta} subjects={subjects} row={editing === "new" ? null : editing} onClose={closeEditing} onSaved={onSaved} />
      )}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="تأیید حذف">
        <p className="mt-0">آیا از حذف این {meta.singular} مطمئن هستید؟ این کار برگشت‌پذیر نیست و در ثبت رویدادها ذخیره می‌شود.</p>
        <div className="flex justify-end gap-2"><button className="btn" onClick={() => setDeleting(null)}>انصراف</button><button className="btn btn-danger" onClick={remove}>حذف</button></div>
      </Modal>
    </div>
  );
}

function EntityForm({ meta, subjects, row, onClose, onSaved }: { meta: EntityMeta; subjects: Subject[]; row: Row | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [vals, setVals] = useState<Record<string, unknown>>(() => {
    const o: Record<string, unknown> = {};
    for (const f of meta.fields) o[f.key] = row ? row[f.key] : f.default ?? (f.type === "boolean" ? false : f.type === "select" ? f.options?.[0]?.value : "");
    return o;
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const set = (k: string, v: unknown) => setVals((s) => ({ ...s, [k]: v }));

  async function upload(f: Field, file: File) {
    setUploading(f.key);
    const fd = new FormData();
    fd.append("file", file);
    if (f.type === "image") fd.append("public", "1");
    const r = await fetch("/api/files", { method: "POST", body: fd });
    const j = await r.json();
    setUploading(null);
    if (!r.ok) return toast("error", j.error ?? "بارگذاری ناموفق بود");
    set(f.key, f.type === "image" ? j.url : j.file.id);
    toast("ok", "فایل بارگذاری شد.");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const body: Record<string, unknown> = {};
    for (const f of meta.fields) {
      if (f.readonly) continue;
      let v = vals[f.key];
      if (f.type === "number") v = v === "" || v === null ? undefined : Number(v);
      if (f.type === "subject") v = v === "" || v === null ? null : Number(v);
      body[f.key] = v;
    }
    const r = await fetch(row ? `/api/crud/${meta.key}/${row.id}` : `/api/crud/${meta.key}`, { method: row ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "ذخیره ناموفق بود");
    toast("ok", "ذخیره شد.");
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={row ? `ویرایش ${meta.singular}` : `${meta.singular} جدید`} wide>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        {meta.fields.map((f) => {
          const id = `f-${f.key}`;
          const full = f.type === "textarea" || f.type === "image" || f.type === "file" || f.type === "datetime" || f.type === "date";
          const v = vals[f.key];
          return (
            <div key={f.key} className={full ? "sm:col-span-2" : ""}>
              {f.type !== "boolean" && <label className="label" htmlFor={id}>{f.label}{f.required && <span className="text-danger"> *</span>}</label>}
              {f.readonly ? (
                <div className="glass-2 p-3 text-sm">{String(v ?? "—")}</div>
              ) : f.type === "textarea" ? (
                <textarea id={id} className="input" rows={5} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === "select" ? (
                <select id={id} className="input" value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              ) : f.type === "subject" ? (
                <select id={id} className="input" value={v === null || v === undefined ? "" : String(v)} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">— بدون درس —</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              ) : f.type === "boolean" ? (
                <div className="flex items-center gap-3 pt-6">
                  <button type="button" id={id} role="switch" aria-checked={!!v} className="switch" onClick={() => set(f.key, !v)} />
                  <label htmlFor={id} className="text-sm font-semibold">{f.label}</label>
                </div>
              ) : f.type === "date" || f.type === "datetime" ? (
                <JalaliDateInput value={v as string | null} onChange={(iso) => set(f.key, iso)} withTime={f.type === "datetime"} label={f.label} />
              ) : f.type === "color" ? (
                <input id={id} type="color" className="input !p-1" value={String(v || "#2358e8")} onChange={(e) => set(f.key, e.target.value)} />
              ) : f.type === "image" || f.type === "file" ? (
                <div className="flex flex-wrap items-center gap-2">
                  {f.type === "image" && <input id={id} className="input ltr min-w-0 flex-1 text-left" placeholder="https://… یا بارگذاری تصویر" value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />}
                  <label className="btn cursor-pointer">
                    {uploading === f.key ? <Loader2 size={17} className="spin" /> : <Upload size={17} />}
                    {f.type === "file" ? (v ? "جایگزینی فایل" : "انتخاب فایل") : "بارگذاری"}
                    <input type="file" className="sr-only" accept={f.type === "image" ? "image/png,image/jpeg,image/webp,image/gif" : undefined} onChange={(e) => e.target.files?.[0] && upload(f, e.target.files[0])} />
                  </label>
                  {f.type === "file" && !!v && <span className="badge badge-ok">فایل پیوست شد</span>}
                  {f.type === "file" && !!v && <button type="button" className="btn btn-ghost btn-sm" onClick={() => set(f.key, null)}>حذف پیوست</button>}
                </div>
              ) : (
                <input id={id} className={`input ${f.type === "url" ? "ltr text-left" : ""}`} type={f.type === "number" ? "number" : "text"} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.help && <div className="hint mt-1">{f.help}</div>}
            </div>
          );
        })}
        {err && <div role="alert" className="field-error sm:col-span-2">{err}</div>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" className="btn" onClick={onClose}>انصراف</button>
          <button className="btn btn-primary" disabled={busy}>{busy && <Loader2 size={17} className="spin" />}ذخیره</button>
        </div>
      </form>
    </Modal>
  );
}
