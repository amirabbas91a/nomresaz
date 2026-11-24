import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { getDisabledFeatures, getSite } from "@/lib/settings";
import { STUDENT_NAV } from "@/lib/nav";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const [off, site] = await Promise.all([getDisabledFeatures(), getSite()]);
  const nav = STUDENT_NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.feature || !off.has(i.feature)) })).filter((g) => g.items.length);
  return (
    <Shell nav={nav} user={{ name: user.name, roleName: user.roleName }} siteName={site.siteName} canAdmin={user.permissions.length > 0}>
      {children}
    </Shell>
  );
}
