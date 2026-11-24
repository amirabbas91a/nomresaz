import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pages, type PageBlock } from "@/db/schema";
import { slugify, uid } from "./utils";

export const blockSchema = z.object({
  id: z.string().max(30).default(() => uid()),
  type: z.enum(["hero", "text", "image", "list", "cta"]),
  title: z.string().max(200).optional(),
  text: z.string().max(5000).optional(),
  imageUrl: z.string().max(500).refine((v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/api/files/"), "نشانی تصویر نامعتبر است.").optional(),
  items: z.array(z.string().max(300)).max(30).optional(),
  buttonLabel: z.string().max(60).optional(),
  buttonUrl: z.string().max(500).refine((v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/"), "پیوند نامعتبر است.").optional(),
});

export async function uniqueSlug(title: string) {
  const base = slugify(title);
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const [ex] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, slug));
    if (!ex) return slug;
    slug = `${base}-${i}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function createPageDraft(title: string, blocks: PageBlock[], userId: string) {
  const slug = await uniqueSlug(title);
  const [row] = await db.insert(pages).values({ title, slug, blocks, status: "draft", createdBy: userId }).returning({ id: pages.id, slug: pages.slug });
  return row;
}
