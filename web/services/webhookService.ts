import { db } from "../../shared/dbClient";
import { webhooks } from "../../shared/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { auditService } from "./auditService";

export const webhookService = {
  listAllWebhooks: async () => {
    const all = await db.select().from(webhooks);
    return all.map(w => ({
      id: w.id,
      sessionId: w.sessionId,
      url: w.url,
      events: JSON.parse(w.events),
      active: w.active === 1,
      createdAt: new Date(w.createdAt).toISOString(),
      updatedAt: new Date(w.updatedAt).toISOString(),
    }));
  },

  listSessionWebhooks: async (sessionId: string) => {
    const list = await db.select().from(webhooks).where(eq(webhooks.sessionId, sessionId));
    return list.map(w => ({
      id: w.id,
      sessionId: w.sessionId,
      url: w.url,
      events: JSON.parse(w.events),
      active: w.active === 1,
      createdAt: new Date(w.createdAt).toISOString(),
      updatedAt: new Date(w.updatedAt).toISOString(),
    }));
  },

  createWebhook: async (sessionId: string, url: string, events: string[], secret?: string) => {
    const id = `wh_${crypto.randomUUID()}`;
    await db.insert(webhooks).values({
      id,
      sessionId,
      url,
      events: JSON.stringify(events || []),
      active: 1,
      secret: secret || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await auditService.logAudit("create_webhook", "info", { sessionId, path: `/api/sessions/${sessionId}/webhooks`, method: "POST" });
    
    return {
      id,
      sessionId,
      url,
      events,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  updateWebhook: async (id: string, url?: string, events?: string[], active?: boolean) => {
    await db.update(webhooks).set({
      ...(url && { url }),
      ...(events && { events: JSON.stringify(events) }),
      ...(active !== undefined && { active: active ? 1 : 0 }),
      updatedAt: Date.now(),
    }).where(eq(webhooks.id, id));
  },

  deleteWebhook: async (id: string) => {
    await db.delete(webhooks).where(eq(webhooks.id, id));
  },

  testWebhook: async (id: string) => {
    const rows = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);
    if (rows.length === 0) throw new Error("Webhook not found");
    const webhookRecord = rows[0];

    const payload = {
      event: "webhook.test",
      timestamp: Date.now(),
      webhookId: id,
      data: { ping: "pong" }
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookRecord.secret) {
      const signature = crypto.createHmac("sha256", webhookRecord.secret).update(JSON.stringify(payload)).digest("hex");
      headers["X-AutoReach-Signature"] = signature;
    }

    try {
      const testRes = await fetch(webhookRecord.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000)
      });
      await auditService.logAudit("test_webhook", "info", {
        sessionId: webhookRecord.sessionId,
        path: `/api/sessions/${webhookRecord.sessionId}/webhooks/${id}/test`,
        method: "POST",
        statusCode: testRes.status,
      });
      return { success: testRes.ok, statusCode: testRes.status };
    } catch (e: unknown) {
      await auditService.logAudit("test_webhook", "error", {
        sessionId: webhookRecord.sessionId,
        path: `/api/sessions/${webhookRecord.sessionId}/webhooks/${id}/test`,
        method: "POST",
        errorMessage: e instanceof Error ? e.message : String(e)
      });
      return { success: false, statusCode: 500 };
    }
  }
};
export default webhookService;
