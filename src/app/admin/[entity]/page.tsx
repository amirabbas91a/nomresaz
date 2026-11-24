import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { ENTITIES } from "@/lib/entity-meta";
import { EntityManager } from "@/components/EntityManager";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminEntityPage({ params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  const meta = ENTITIES[entity];
  if (!meta) notFound();
  await requireAdminPage(meta.perm);
  return (
    <>
      <PageHeader title={meta.title} subtitle={meta.description} />
      <EntityManager meta={meta} />
    </>
  );
}
