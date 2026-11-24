import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireAdminPage } from "@/lib/auth";
import { PageEditor } from "@/components/PageEditor";
import { PageHeader } from "@/components/ui";

export default async function PageEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("appearance");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [p] = await db.select().from(pages).where(eq(pages.id, id));
  if (!p) notFound();
  return (<><PageHeader title="ویرایش صفحه" /><PageEditor id={p.id} slug={p.slug} initial={{ title: p.title, blocks: p.blocks, status: p.status as "draft" | "published" }} /></>);
}
