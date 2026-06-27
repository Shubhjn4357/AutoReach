import { db } from "../../shared/dbClient";
import { auditLogs } from "../../shared/db";
import crypto from "crypto";

export const auditService = {
  logAudit: async (action: string, severity: 'info' | 'warn' | 'error', details?: {
    apiKeyId?: string;
    apiKeyName?: string;
    sessionId?: string;
    sessionName?: string;
    ipAddress?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    errorMessage?: string;
  }) => {
    try {
      await db.insert(auditLogs).values({
        id: `audit_${crypto.randomUUID()}`,
        action,
        severity,
        apiKeyId: details?.apiKeyId || null,
        apiKeyName: details?.apiKeyName || null,
        sessionId: details?.sessionId || null,
        sessionName: details?.sessionName || null,
        ipAddress: details?.ipAddress || null,
        method: details?.method || null,
        path: details?.path || null,
        statusCode: details?.statusCode || null,
        errorMessage: details?.errorMessage || null,
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error("Failed to log audit event:", err);
    }
  }
};
export default auditService;
