"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useToast } from "./Toast";

export function DoneToggle({ id, done }: { id: number; done: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [on, setOn] = useState(done);
  async function toggle() {
    const next = !on;
    setOn(next);
    const r = await fetch(`/api/assignments/${id}/done`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: next }) });
    if (!r.ok) { setOn(!next); toast("error", "ثبت وضعیت ناموفق بود."); } else router.refresh();
  }
  return (
    <button onClick={toggle} role="switch" aria-checked={on} className={`btn btn-sm ${on ? "btn-primary" : ""}`}>
      <Check size={16} />{on ? "انجام شد" : "انجام‌شده؟"}
    </button>
  );
}
