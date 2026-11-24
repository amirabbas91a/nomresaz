import { requireUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "حساب کاربری" };

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="حساب کاربری" subtitle={`${user.email} · ${user.roleName}`} />
      <div className="mx-auto max-w-xl"><ProfileForm name={user.name} visible={user.leaderboardVisible} /></div>
    </>
  );
}
