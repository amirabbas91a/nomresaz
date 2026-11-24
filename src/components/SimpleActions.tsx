"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "./Toast";

/** POST to an endpoint then navigate or refresh. */
export function ActionButton({
  url, method = "POST", body, label, icon, className = "btn", redirectTo, confirmText, successText,
}: { url: string; method?: string; body?: unknown; label: string; icon?: "plus"; className?: string; redirectTo?: string; confirmText?: string; successText?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return toast("error", j.error ?? "عملیات ناموفق بود");
    if (successText) toast("ok", successText);
    if (redirectTo) router.push(redirectTo.replace("{id}", String(j.id ?? j.attemptId ?? "")));
    router.refresh();
  }
  return (
    <button className={className} onClick={run} disabled={busy}>
      {busy ? <Loader2 size={17} className="spin" /> : icon === "plus" ? <Plus size={17} /> : null}
      {label}
    </button>
  );
}
