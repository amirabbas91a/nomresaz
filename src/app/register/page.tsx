import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "ساخت حساب جدید" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="my-auto w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center"><Logo /></Link>
        <div className="glass-solid p-7">
          <h1 className="m-0 text-2xl font-extrabold">ساخت حساب جدید</h1>
          <p className="mb-5 mt-1 text-sm text-muted">در چند ثانیه عضو نمره‌ساز شو.</p>
          <AuthForm mode="register" />
        </div>
      </div>
    </main>
  );
}
