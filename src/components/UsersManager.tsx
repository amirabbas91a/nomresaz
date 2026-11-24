"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { formatJalali } from "@/lib/jalali";

type U = { id: string; name: string; email: string; roleKey: string; active: boolean; createdAt: string; lastLoginAt: string | null };
type R = { key: string; name: string; permissions: string[]; isSystem: boolean };
type P = { key: string; label: string };

export function UsersManager({ users, roles, perms, me, isOwner }: { users: U[]; roles: R[]; perms: P[]; me: string; isOwner: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [change, setChange] = useState<{ u: U; roleKey?: string; active?: boolean } | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [rp, setRp] = useState<Record<string, string[]>>(Object.fromEntries(roles.map((r) => [r.key, r.permissions])));
  const [newName, setNewName] = useState("");

  async function apply() {
    if (!change) return;
    setBusy(true);
    const r = await fetch(`/api/admin/users/${change.u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roleKey: change.roleKey, active: change.active, password: pw }) });
    setBusy(false);
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "تغییر اعمال و ثبت شد."); setChange(null); setPw(""); router.refresh();
  }
  async function saveRole(key: string) {
    const r = await fetch("/api/admin/roles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key, permissions: rp[key] }) });
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    toast("ok", "مجوزها ذخیره شد."); router.refresh();
  }
  async function addRole() {
    const r = await fetch("/api/admin/roles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, permissions: [] }) });
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    setNewName(""); toast("ok", "نقش ساخته شد."); router.refresh();
  }
  async function delRole(key: string) {
    if (!confirm("این نقش حذف شود؟")) return;
    const r = await fetch(`/api/admin/roles?key=${key}`, { method: "DELETE" });
    if (!r.ok) return toast("error", (await r.json()).error ?? "خطا");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex gap-2"><button className="chip" aria-pressed={tab === "users"} onClick={() => setTab("users")}>کاربران</button><button className="chip" aria-pressed={tab === "roles"} onClick={() => setTab("roles")}>نقش‌ها و مجوزها</button></div>
      {tab === "users" ? (
        <div className="glass-solid tbl-wrap"><table className="tbl"><thead><tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>وضعیت</th><th>عضویت</th><th>آخرین ورود</th></tr></thead><tbody>
          {users.map((u) => (
            <tr key={u.id}><td className="font-bold">{u.name}{u.id === me && <span className="badge badge-info ms-2">شما</span>}</td><td className="ltr text-left">{u.email}</td>
              <td><select className="input !min-h-[36px] !w-auto" value={u.roleKey} disabled={u.id === me} aria-label={`نقش ${u.name}`} onChange={(e) => setChange({ u, roleKey: e.target.value })}>{roles.filter((r) => isOwner || r.key !== "owner").map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></td>
              <td><button className="switch" role="switch" aria-checked={u.active} disabled={u.id === me} aria-label={`فعال بودن ${u.name}`} onClick={() => setChange({ u, active: !u.active })} /></td>
              <td className="text-xs text-muted">{formatJalali(u.createdAt)}</td><td className="text-xs text-muted">{formatJalali(u.lastLoginAt, true)}</td></tr>
          ))}</tbody></table></div>
      ) : (
        <div className="grid gap-4">
          {!isOwner && <div className="badge badge-warn !rounded-xl !px-3 !py-2">فقط مالک اصلی می‌تواند مجوز نقش‌ها را تغییر دهد.</div>}
          {roles.map((r) => (
            <section key={r.key} className="glass-solid p-5"><div className="mb-3 flex flex-wrap items-center gap-2"><h3 className="m-0 font-extrabold">{r.name}</h3>{r.isSystem && <span className="badge">سیستمی</span>}<span className="flex-1" />
              {r.key !== "owner" && isOwner && <><button className="btn btn-sm btn-primary" onClick={() => saveRole(r.key)}>ذخیره مجوزها</button>{!r.isSystem && <button className="btn btn-sm btn-danger" onClick={() => delRole(r.key)}>حذف</button>}</>}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{perms.map((p) => {
                const on = r.key === "owner" || rp[r.key]?.includes(p.key);
                return <label key={p.key} className={`flex items-center gap-2 rounded-xl border border-[var(--glass-border)] p-2 text-sm ${r.key === "owner" || !isOwner ? "opacity-70" : "cursor-pointer"}`}><input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={!!on} disabled={r.key === "owner" || !isOwner} onChange={(e) => setRp({ ...rp, [r.key]: e.target.checked ? [...(rp[r.key] ?? []), p.key] : (rp[r.key] ?? []).filter((x) => x !== p.key) })} />{p.label}</label>;
              })}</div></section>
          ))}
          {isOwner && <div className="glass-solid flex flex-wrap items-end gap-2 p-4"><div className="min-w-[200px] flex-1"><label className="label" htmlFor="nr">نقش سفارشی جدید</label><input id="nr" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="مثلاً: دبیر ریاضی" /></div><button className="btn btn-primary" disabled={newName.trim().length < 2} onClick={addRole}>افزودن نقش</button></div>}
        </div>
      )}
      <Modal open={!!change} onClose={() => { setChange(null); setPw(""); }} title="تأیید تغییر حساس">
        {change && <>
          <p className="mt-0 text-sm">{change.roleKey ? <>نقش «{change.u.name}» به <b>{roles.find((r) => r.key === change.roleKey)?.name}</b> تغییر کند؟</> : <>حساب «{change.u.name}» {change.active ? "فعال" : "غیرفعال (و تمام نشست‌هایش بسته)"} شود؟</>} این کار در ثبت رویدادها نگهداری می‌شود.</p>
          <label className="label" htmlFor="rp">برای تأیید، رمز عبور خودتان را وارد کنید</label><input id="rp" type="password" dir="ltr" className="input ltr text-left" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
          <div className="mt-4 flex justify-end gap-2"><button className="btn" onClick={() => { setChange(null); setPw(""); }}>انصراف</button><button className="btn btn-primary" disabled={busy || !pw} onClick={apply}>{busy && <Loader2 size={16} className="spin" />}تأیید و اعمال</button></div>
        </>}
      </Modal>
    </div>
  );
}
