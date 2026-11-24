"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";

export function FloatingAssistant() {
  const path = usePathname();
  if (path.startsWith("/admin/assistant")) return null;
  return (
    <Link href="/admin/assistant" aria-label="باز کردن دستیار ChatGPT - نمره‌ساز" title="ChatGPT - نمره‌ساز"
      className="glass-float card-hover !fixed bottom-24 end-4 z-40 grid h-14 w-14 place-items-center rounded-full text-brand md:bottom-6 md:end-6">
      <Bot size={26} />
    </Link>
  );
}
