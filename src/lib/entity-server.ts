import "server-only";
import { z } from "zod";
import { ads, announcements, assignments, contests, events, programs, resources, subjects, suggestions, tips } from "@/db/schema";
import { ENTITIES, type EntityMeta, type Field } from "./entity-meta";
import { HttpError } from "./api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TABLES: Record<string, any> = {
  subjects, library: resources, tips, assignments, announcements, events, contests, programs, ads, suggestions,
};

export function getEntity(key: string): EntityMeta {
  const m = ENTITIES[key];
  if (!m || !TABLES[key]) throw new HttpError(404, "موجودیت یافت نشد.");
  return m;
}

function fieldSchema(f: Field): z.ZodType {
  const opt = (s: z.ZodType) => (f.required ? s : s.nullable().optional());
  switch (f.type) {
    case "text":
      return f.required ? z.string().trim().min(1, `«${f.label}» الزامی است.`).max(300) : z.string().trim().max(300).nullable().optional();
    case "textarea":
      return f.required ? z.string().trim().min(1, `«${f.label}» الزامی است.`).max(20000) : z.string().trim().max(20000).nullable().optional();
    case "number":
      return z.coerce.number().int().min(0).max(1_000_000).optional();
    case "boolean":
      return z.boolean().optional();
    case "select":
      return z.enum((f.options ?? []).map((o) => o.value) as [string, ...string[]]).optional();
    case "date":
    case "datetime":
      return opt(z.string().datetime({ offset: true }));
    case "color":
      return z.string().regex(/^#[0-9a-fA-F]{6}$/, "رنگ نامعتبر است.").optional();
    case "url":
    case "image":
      return z
        .string()
        .trim()
        .max(500)
        .refine((v) => v === "" || /^https?:\/\//i.test(v) || v.startsWith("/api/files/"), "نشانی باید با http یا https شروع شود.")
        .nullable()
        .optional();
    case "file":
      return z.string().uuid().nullable().optional();
    case "subject":
      return z.coerce.number().int().positive().nullable().optional();
  }
}

export function parseEntityInput(meta: EntityMeta, body: unknown, partial: boolean) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of meta.fields) if (!f.readonly) shape[f.key] = fieldSchema(f);
  const schema = z.object(shape);
  const parsed = (partial ? schema.partial() : schema).parse(body) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of meta.fields) {
    if (f.readonly || !(f.key in parsed)) continue;
    let v = parsed[f.key];
    if (v === "" || v === undefined) v = f.required ? v : null;
    if ((f.type === "date" || f.type === "datetime") && typeof v === "string") v = new Date(v);
    if (f.type === "subject" && (v === 0 || v === "")) v = null;
    if (f.type === "number" && v === undefined) continue;
    out[f.key] = v;
  }
  return out;
}
