import { db } from "@/db";
import { features as featuresTable } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { FEATURES, FEATURE_LABELS } from "@/lib/features";
import { getServices, SERVICE_STATE_LABEL } from "@/lib/services";
import { FeaturesCenter } from "@/components/FeaturesCenter";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "مرکز قابلیت‌ها" };

export default async function FeaturesPage() {
  await requireAdminPage("settings");
  const rows = await db.select().from(featuresTable);
  const off = new Set(rows.filter((r) => !r.enabled).map((r) => r.key));
  const services = await getServices();
  return (
    <>
      <PageHeader title="مرکز قابلیت‌ها" subtitle="وضعیت واقعی هر قابلیت و سرویس. قابلیت‌های ساخته‌نشده کنترل فعال‌سازی ندارند." />
      <FeaturesCenter
        features={FEATURES.map((f) => ({ key: f.key, label: f.label, description: f.description, status: f.status, statusLabel: FEATURE_LABELS[f.status], togglable: f.togglable, enabled: !off.has(f.key) }))}
        services={services.map((s) => ({ key: s.key, label: s.label, detail: s.detail, stateLabel: SERVICE_STATE_LABEL[s.state].label, cls: SERVICE_STATE_LABEL[s.state].cls, testable: s.testable }))}
      />
    </>
  );
}
