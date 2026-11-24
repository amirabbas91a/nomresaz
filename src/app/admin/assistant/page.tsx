import { requireAdminPage } from "@/lib/auth";
import { gate } from "@/lib/gate";
import { aiConfigured } from "@/lib/ai";
import { Assistant } from "@/components/Assistant";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "ChatGPT - نمره‌ساز" };

export default async function AssistantPage() {
  await requireAdminPage("ai");
  await gate("ai");
  return (
    <>
      <PageHeader title="ChatGPT - نمره‌ساز" subtitle="دستیار مدیریتی؛ فقط با ابزارهای امن سرور کار می‌کند و عملیات حساس را با تأیید شما اجرا می‌کند." />
      <Assistant configured={aiConfigured()} />
    </>
  );
}
