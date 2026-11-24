import { z } from "zod";
import { handler, needPerm, readJson } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { createPageDraft } from "@/lib/pages";
import { uid } from "@/lib/utils";

export const POST = handler(async (req) => {
  const user = await needPerm("appearance");
  const { title } = z.object({ title: z.string().trim().min(2).max(200).default("صفحه جدید") }).parse(await readJson(req).catch(() => ({})));
  const r = await createPageDraft(title, [{ id: uid(), type: "hero", title, text: "" }], user.id);
  await logAudit({ user, action: "pages.create", entity: "pages", entityId: r.id });
  return { id: r.id };
});
