"use client";
import { TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="glass-solid max-w-md p-10 text-center">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-[var(--danger-bg)] text-danger"><TriangleAlert size={30} /></span>
        <h1 className="m-0 text-2xl font-extrabold">مشکلی پیش آمد</h1>
        <p className="text-sm text-muted">خطایی در پردازش درخواست رخ داد. جزئیات فنی نمایش داده نمی‌شود. دوباره تلاش کنید.</p>
        <button className="btn btn-primary" onClick={reset}>تلاش دوباره</button>
      </div>
    </main>
  );
}
