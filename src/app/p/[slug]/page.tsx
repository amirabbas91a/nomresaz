import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { getSite } from "@/lib/settings";
import { Logo } from "@/components/Logo";
import { PageBlocks } from "@/components/PageBlocks";

export const dynamic = "force-dynamic";

export default async function PublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug);
  const [p] = await db.select().from(pages).where(and(eq(pages.slug, slug), eq(pages.status, "published")));
  if (!p) notFound();
  const site = await getSite();
  return (
    <>
      <header className="px-3 pt-3"><div className="glass mx-auto flex max-w-[960px] items-center justify-between px-4 py-2.5" style={{ borderRadius: 22 }}><Link href="/"><Logo name={site.siteName} /></Link><Link href="/dashboard" className="btn btn-primary btn-sm">ورود به سامانه</Link></div></header>
      <main className="mx-auto max-w-[960px] px-4 py-10"><PageBlocks blocks={p.blocks} /></main>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const slug = decodeURIComponent((await params).slug);
  const [p] = await db.select({ t: pages.title }).from(pages).where(and(eq(pages.slug, slug), eq(pages.status, "published")));
  return { title: p?.t ?? "صفحه" };
}
