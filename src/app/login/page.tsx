import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";
import { ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "ورود" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="my-auto w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center"><Logo /></Link>
        <div className="glass-solid p-7">
          <h1 className="m-0 text-2xl font-extrabold">ورود به حساب</h1>
          <p className="mb-5 mt-1 text-sm text-muted">خوش برگشتی! برای ادامه وارد شو.</p>
          <AuthForm mode="login" />
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-xs text-faint"><ShieldCheck size={15} />رمز شما با الگوریتم scrypt ذخیره می‌شود.</p>
      </div>
    </main>
  );
}
