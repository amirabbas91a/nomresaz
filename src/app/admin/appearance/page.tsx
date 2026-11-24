import { requireAdminPage } from "@/lib/auth";
import { getHomeSections, getSetting, getSite } from "@/lib/settings";
import { AppearanceForm } from "@/components/AppearanceForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "ظاهر و صفحه اصلی" };

export default async function Appearance() {
  await requireAdminPage("appearance");
  const [site, sections, bale] = await Promise.all([getSite(), getHomeSections(), getSetting("bale_url", "https://ble.ir/moaalem2")]);
  return (<><PageHeader title="ظاهر و صفحه اصلی" /><AppearanceForm site={site} sections={sections} baleUrl={bale} /></>);
}
