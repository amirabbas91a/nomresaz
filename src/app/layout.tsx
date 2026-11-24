import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { Ambient } from "@/components/Ambient";

export const metadata: Metadata = {
  title: { default: "نمره‌ساز — پلتفرم هوشمند آموزشی پایه نهم", template: "%s | نمره‌ساز" },
  description: "نکته‌نامه‌ساز هوشمند، آزمون آنلاین، تکالیف، کتابخانه منابع و رتبه‌بندی برای دانش‌آموزان پایه نهم.",
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#e4eeff" }, { media: "(prefers-color-scheme: dark)", color: "#050c24" }],
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

const themeScript = `try{var t=localStorage.getItem('nm-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <Ambient />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
