import { db } from "../../shared/dbClient";
import { campaigns, campaignRecipients } from "../../shared/db";
import { eq } from "drizzle-orm";
import { SyncOperation } from "../../shared/types";

export const crmService = {
  syncOperations: async (operations: Omit<SyncOperation, "id">[], _defaultUserId: string | null) => {
    const syncedIds: string[] = [];
    const errors: { recordId: string; error: string }[] = [];

    for (const op of operations) {
      try {
        const payload = typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;

        if (op.table === "campaigns") {
          if (op.operation === "CREATE" || op.operation === "UPDATE") {
            const createdAtVal = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now();
            const updatedAtVal = payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now();

            // 1. Insert/Update Campaign record
            await db
              .insert(campaigns)
              .values({
                id: op.recordId,
                name: payload.name || "Unnamed Campaign",
                messageTemplateId: payload.messageTemplateId || null,
                messageBody: payload.messageBody || null,
                status: payload.status || "scheduled",
                mediaUrl: payload.mediaUrl || null,
                scheduledAt: payload.scheduledAt || null,
                createdAt: createdAtVal,
                updatedAt: updatedAtVal,
              })
              .onConflictDoUpdate({
                target: campaigns.id,
                set: {
                  name: payload.name || "Unnamed Campaign",
                  messageTemplateId: payload.messageTemplateId || null,
                  messageBody: payload.messageBody || null,
                  status: payload.status || "scheduled",
                  mediaUrl: payload.mediaUrl || null,
                  scheduledAt: payload.scheduledAt || null,
                  updatedAt: updatedAtVal,
                },
              });

            // 2. Sync Campaign Recipients
            if (payload.recipients && Array.isArray(payload.recipients)) {
              // Clear current recipients to prevent duplicate/stale records
              await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, op.recordId));

              const batchRecipients = payload.recipients.map((rec: { phone: string; name?: string }) => ({
                id: `cr_${Math.random().toString(36).substring(2, 9)}`,
                campaignId: op.recordId,
                phone: rec.phone,
                name: rec.name || null,
                status: "pending",
              }));

              if (batchRecipients.length > 0) {
                const chunkSize = 100;
                for (let i = 0; i < batchRecipients.length; i += chunkSize) {
                  const chunk = batchRecipients.slice(i, i + chunkSize);
                  await db.insert(campaignRecipients).values(chunk);
                }
              }
            }
          } else if (op.operation === "DELETE") {
            await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, op.recordId));
            await db.delete(campaigns).where(eq(campaigns.id, op.recordId));
          }
        }
        syncedIds.push(op.recordId);
      } catch (err: unknown) {
        errors.push({ recordId: op.recordId, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return {
      success: errors.length === 0,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
};
export default crmService;
