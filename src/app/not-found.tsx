import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="glass-solid fade-up max-w-md p-10 text-center">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-[var(--brand-soft)] text-brand"><SearchX size={30} /></span>
        <h1 className="m-0 text-2xl font-extrabold">صفحه پیدا نشد</h1>
        <p className="text-sm text-muted">نشانی اشتباه است، صفحه حذف شده یا این بخش در حال حاضر غیرفعال است.</p>
        <Link href="/" className="btn btn-primary">بازگشت به صفحه اصلی</Link>
      </div>
    </main>
  );
}
