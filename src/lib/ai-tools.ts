import "server-only";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { announcements, auditLogs, exams, features, notebooks, pages, resources, subjects, surveys, users, examAttempts } from "@/db/schema";
import type { SessionUser } from "./auth";
import { hasPerm } from "./auth";
import { FEATURES } from "./features";
import { blockSchema, createPageDraft } from "./pages";
import { questionSchema } from "./exam";
import { uid } from "./utils";

export type ToolDef = {
  name: string;
  description: string;
  perm: string;
  sensitive: boolean;
  parameters: Record<string, unknown>;
  schema: z.ZodType;
  summarize: (args: never) => string;
  run: (args: never, user: SessionUser) => Promise<string>;
};

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({ type: "object", properties, required, additionalProperties: false });

function def<S extends z.ZodType>(d: Omit<ToolDef, "schema" | "run" | "summarize"> & { schema: S; summarize: (a: z.infer<S>) => string; run: (a: z.infer<S>, u: SessionUser) => Promise<string> }): ToolDef {
  return d as unknown as ToolDef;
}

export const TOOLS: ToolDef[] = [
  def({
    name: "get_site_stats", description: "آمار واقعی سایت: تعداد کاربران، منابع، آزمون‌ها، نظرسنجی‌ها، نکته‌نامه‌ها و شرکت در آزمون.", perm: "ai", sensitive: false, parameters: obj({}),
    schema: z.object({}), summarize: () => "دریافت آمار سایت",
    run: async () => {
      const c = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
      const r = {
        users: await c(db.select({ n: count() }).from(users)), resources: await c(db.select({ n: count() }).from(resources)),
        publishedExams: await c(db.select({ n: count() }).from(exams).where(eq(exams.status, "published"))), surveys: await c(db.select({ n: count() }).from(surveys)),
        notebooks: await c(db.select({ n: count() }).from(notebooks)), pendingNotebooks: await c(db.select({ n: count() }).from(notebooks).where(eq(notebooks.status, "pending"))),
        examAttempts: await c(db.select({ n: count() }).from(examAttempts)),
      };
      return JSON.stringify(r);
    },
  }),
  def({
    name: "list_subjects", description: "فهرست درس‌ها با شناسه، استاد و وضعیت.", perm: "subjects", sensitive: false, parameters: obj({}),
    schema: z.object({}), summarize: () => "فهرست درس‌ها",
    run: async () => JSON.stringify((await db.select().from(subjects).orderBy(subjects.sortOrder)).map((s) => ({ id: s.id, name: s.name, teacher: s.teacher, active: s.active }))),
  }),
  def({
    name: "get_recent_audit", description: "آخرین رویدادهای ثبت‌شده در سامانه (حداکثر ۲۰).", perm: "audit", sensitive: false, parameters: obj({ limit: { type: "integer" } }),
    schema: z.object({ limit: z.number().int().min(1).max(20).optional() }), summarize: () => "خواندن ثبت رویدادها",
    run: async (a) => JSON.stringify((await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(a.limit ?? 10)).map((l) => ({ at: l.createdAt, user: l.userName, action: l.action, result: l.result }))),
  }),
  def({
    name: "create_exam_draft", description: "ساخت پیش‌نویس آزمون. فقط پیش‌نویس ساخته می‌شود و انتشار با مدیر است. نوع سؤال: mcq(correct=اندیس)، tf(boolean)، blank/short(رشته)، essay.", perm: "exams", sensitive: false,
    parameters: obj({ title: { type: "string" }, subjectId: { type: "integer" }, durationMin: { type: "integer" }, questions: { type: "array", items: obj({ type: { type: "string", enum: ["mcq", "tf", "blank", "short", "essay"] }, text: { type: "string" }, options: { type: "array", items: { type: "string" } }, correct: {}, marks: { type: "number" }, explanation: { type: "string" } }, ["type", "text"]) } }, ["title", "questions"]),
    schema: z.object({ title: z.string().min(2).max(200), subjectId: z.number().int().optional(), durationMin: z.number().int().min(1).max(300).optional(), questions: z.array(z.object({ type: z.enum(["mcq", "tf", "blank", "short", "essay"]), text: z.string(), options: z.array(z.string()).optional(), correct: z.union([z.number(), z.boolean(), z.string()]).optional(), marks: z.number().optional(), explanation: z.string().optional() })).min(1).max(100) }),
    summarize: (a) => `ساخت پیش‌نویس آزمون «${a.title}» با ${a.questions.length} سؤال`,
    run: async (a, u) => {
      const qs = a.questions.map((q) => questionSchema.parse({ ...q, id: uid(), marks: q.marks ?? 1 }));
      const [row] = await db.insert(exams).values({ title: a.title, subjectId: a.subjectId ?? null, durationMin: a.durationMin ?? 30, questions: qs, status: "draft", createdBy: u.id }).returning({ id: exams.id });
      return `پیش‌نویس آزمون ساخته شد (شناسه ${row.id}). مسیر ویرایش: /admin/exams/${row.id}`;
    },
  }),
  def({
    name: "create_announcement_draft", description: "ساخت پیش‌نویس اطلاعیه (منتشر نمی‌شود).", perm: "announcements", sensitive: false, parameters: obj({ title: { type: "string" }, body: { type: "string" } }, ["title", "body"]),
    schema: z.object({ title: z.string().min(2).max(200), body: z.string().min(2).max(5000) }), summarize: (a) => `پیش‌نویس اطلاعیه «${a.title}»`,
    run: async (a) => { const [r] = await db.insert(announcements).values({ title: a.title, body: a.body, status: "draft" }).returning({ id: announcements.id }); return `پیش‌نویس اطلاعیه ساخته شد (شناسه ${r.id}).`; },
  }),
  def({
    name: "create_page_draft", description: "ساخت پیش‌نویس صفحه از بلوک‌های امن (hero,text,image,list,cta). هرگز HTML ننویس.", perm: "appearance", sensitive: false,
    parameters: obj({ title: { type: "string" }, blocks: { type: "array", items: obj({ type: { type: "string", enum: ["hero", "text", "image", "list", "cta"] }, title: { type: "string" }, text: { type: "string" }, imageUrl: { type: "string" }, items: { type: "array", items: { type: "string" } }, buttonLabel: { type: "string" }, buttonUrl: { type: "string" } }, ["type"]) } }, ["title", "blocks"]),
    schema: z.object({ title: z.string().min(2).max(200), blocks: z.array(blockSchema).min(1).max(30) }), summarize: (a) => `پیش‌نویس صفحه «${a.title}» با ${a.blocks.length} بلوک`,
    run: async (a, u) => { const r = await createPageDraft(a.title, a.blocks.map((b) => ({ ...b, id: uid() })), u.id); return `پیش‌نویس صفحه ساخته شد (شناسه ${r.id}، نشانی /p/${r.slug}). مسیر ویرایش: /admin/pages/${r.id}`; },
  }),
  def({
    name: "update_subject", description: "تغییر استاد، توضیح یا فعال‌بودن یک درس. نیازمند تأیید.", perm: "subjects", sensitive: true,
    parameters: obj({ id: { type: "integer" }, teacher: { type: "string" }, description: { type: "string" }, active: { type: "boolean" } }, ["id"]),
    schema: z.object({ id: z.number().int(), teacher: z.string().max(100).optional(), description: z.string().max(1000).optional(), active: z.boolean().optional() }),
    summarize: (a) => `ویرایش درس شماره ${a.id}: ${JSON.stringify({ teacher: a.teacher, description: a.description, active: a.active })}`,
    run: async (a) => { const { id, ...set } = a; const [r] = await db.update(subjects).set(set).where(eq(subjects.id, id)).returning({ name: subjects.name }); return r ? `درس «${r.name}» به‌روزرسانی شد.` : "درس یافت نشد."; },
  }),
  def({
    name: "publish_announcement", description: "انتشار عمومی یک اطلاعیه. نیازمند تأیید صریح.", perm: "announcements", sensitive: true, parameters: obj({ id: { type: "integer" } }, ["id"]),
    schema: z.object({ id: z.number().int() }), summarize: (a) => `انتشار عمومی اطلاعیه شماره ${a.id}`,
    run: async (a) => { const [r] = await db.update(announcements).set({ status: "published" }).where(eq(announcements.id, a.id)).returning({ t: announcements.title }); return r ? `اطلاعیه «${r.t}» منتشر شد.` : "اطلاعیه یافت نشد."; },
  }),
  def({
    name: "publish_page", description: "انتشار عمومی یک صفحه پیش‌نویس. نیازمند تأیید صریح.", perm: "appearance", sensitive: true, parameters: obj({ id: { type: "integer" } }, ["id"]),
    schema: z.object({ id: z.number().int() }), summarize: (a) => `انتشار عمومی صفحه شماره ${a.id}`,
    run: async (a) => { const [r] = await db.update(pages).set({ status: "published" }).where(eq(pages.id, a.id)).returning({ s: pages.slug }); return r ? `صفحه منتشر شد: /p/${r.s}` : "صفحه یافت نشد."; },
  }),
  def({
    name: "set_feature_enabled", description: `فعال/غیرفعال‌کردن یک قابلیت سایت. کلیدهای مجاز: ${FEATURES.filter((f) => f.togglable).map((f) => f.key).join(", ")}. نیازمند تأیید.`, perm: "settings", sensitive: true,
    parameters: obj({ key: { type: "string" }, enabled: { type: "boolean" } }, ["key", "enabled"]),
    schema: z.object({ key: z.string(), enabled: z.boolean() }), summarize: (a) => `${a.enabled ? "فعال‌سازی" : "غیرفعال‌سازی"} قابلیت «${a.key}»`,
    run: async (a) => {
      if (!FEATURES.some((f) => f.key === a.key && f.togglable)) return "کلید قابلیت نامعتبر است.";
      await db.insert(features).values({ key: a.key, enabled: a.enabled }).onConflictDoUpdate({ target: features.key, set: { enabled: a.enabled } });
      return `قابلیت «${a.key}» ${a.enabled ? "فعال" : "غیرفعال"} شد.`;
    },
  }),
];

export function toolsFor(user: SessionUser) {
  return TOOLS.filter((t) => hasPerm(user, t.perm));
}

export function toOpenAiTools(user: SessionUser) {
  return toolsFor(user).map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } }));
}
