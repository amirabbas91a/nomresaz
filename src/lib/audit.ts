import "server-only";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";

type Actor = { id: string; name: string } | null;

/** Never pass passwords, tokens or secrets in `reason`/`entityId`. */
export async function logAudit(p: {
  user: Actor;
  action: string;
  entity?: string;
  entityId?: string | number;
  result?: "ok" | "denied" | "failed";
  reason?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      userId: p.user?.id ?? null,
      userName: p.user?.name ?? null,
      action: p.action,
      entity: p.entity ?? null,
      entityId: p.entityId !== undefined ? String(p.entityId) : null,
      result: p.result ?? "ok",
      reason: p.reason?.slice(0, 500) ?? null,
    });
  } catch (e) {
    console.error("audit failed", e instanceof Error ? e.message : e);
  }
}
