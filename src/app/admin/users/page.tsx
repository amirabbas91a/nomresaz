import { desc } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { UsersManager } from "@/components/UsersManager";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "کاربران و نقش‌ها" };

export default async function AdminUsers() {
  const me = await requireAdminPage("users");
  const [u, r] = await Promise.all([db.select().from(users).orderBy(desc(users.createdAt)).limit(500), db.select().from(roles)]);
  return (
    <>
      <PageHeader title="کاربران و نقش‌ها" subtitle="تغییر نقش و غیرفعال‌سازی با تأیید رمز عبور انجام و ثبت می‌شود." />
      <UsersManager
        users={u.map((x) => ({ id: x.id, name: x.name, email: x.email, roleKey: x.roleKey, active: x.active, createdAt: x.createdAt.toISOString(), lastLoginAt: x.lastLoginAt?.toISOString() ?? null }))}
        roles={r.map((x) => ({ key: x.key, name: x.name, permissions: x.permissions, isSystem: x.isSystem }))}
        perms={PERMISSIONS.map((p) => ({ key: p.key, label: p.label }))} me={me.id} isOwner={me.isOwner}
      />
    </>
  );
}
