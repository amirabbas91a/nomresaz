import type { ReactNode } from "react";
import { hasPerm, requireAdminPage } from "@/lib/auth";
import { getDisabledFeatures, getSite } from "@/lib/settings";
import { ADMIN_NAV } from "@/lib/nav";
import { Shell } from "@/components/Shell";
import { FloatingAssistant } from "@/components/FloatingAssistant";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();
  const [off, site] = await Promise.all([getDisabledFeatures(), getSite()]);
  const nav = ADMIN_NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.perm || hasPerm(user, i.perm)) && (!i.feature || !off.has(i.feature))),
  })).filter((g) => g.items.length);
  return (
    <Shell admin canAdmin nav={nav} user={{ name: user.name, roleName: user.roleName }} siteName={site.siteName}>
      {children}
      {hasPerm(user, "ai") && !off.has("ai") && <FloatingAssistant />}
    </Shell>
  );
}
