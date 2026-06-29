import { db } from "../../shared/dbClient";
import { apiKeys } from "../../shared/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { auditService } from "./auditService";

export const apiKeyService = {
  seedDefaultKey: async () => {
    // Hardcoded developer key seeding removed for security
  },

  validateKey: async (key: string) => {
    try {
      const prefix = key.substring(0, 8);
      const hash = crypto.createHash("sha256").update(key).digest("hex");
      const rows = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.keyPrefix, prefix), eq(apiKeys.apiKeyHash, hash), eq(apiKeys.isActive, 1)))
        .limit(1);

      if (rows.length === 0) return null;
      const keyRecord = rows[0];
      if (keyRecord.expiresAt && keyRecord.expiresAt < Date.now()) return null;

      // Increment usage count in background
      db.update(apiKeys)
        .set({ usageCount: keyRecord.usageCount + 1, lastUsedAt: Date.now() })
        .where(eq(apiKeys.id, keyRecord.id))
        .catch((err) => console.error("Failed to update API key stats:", err));

      return keyRecord;
    } catch (err) {
      console.error("API key validation failed:", err);
      return null;
    }
  },

  listKeys: async () => {
    const list = await db.select().from(apiKeys);
    return list.map(k => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      apiKey: k.apiKey,
      role: k.role,
      isActive: k.isActive === 1,
      usageCount: k.usageCount,
      expiresAt: k.expiresAt ? new Date(k.expiresAt).toISOString() : null,
      lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
      createdAt: new Date(k.createdAt).toISOString(),
    }));
  },

  createKey: async (name: string, role?: string, expiresAt?: string) => {
    const rawKey = `owa_${crypto.randomBytes(24).toString("hex")}`;
    const prefix = rawKey.substring(0, 8);
    const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const id = `key_${crypto.randomUUID()}`;
    
    await db.insert(apiKeys).values({
      id,
      name: name || "New API Key",
      keyPrefix: prefix,
      apiKeyHash: hash,
      apiKey: rawKey,
      role: role || "operator",
      isActive: 1,
      usageCount: 0,
      expiresAt: expiresAt ? new Date(expiresAt).getTime() : null,
      createdAt: Date.now(),
    });

    await auditService.logAudit("create_api_key", "info", { apiKeyName: name, path: "/api/auth/api-keys", method: "POST" });
    
    return {
      id,
      name,
      keyPrefix: prefix,
      role: role || "operator",
      isActive: true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      apiKey: rawKey,
    };
  },

  deleteKey: async (id: string) => {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
    await auditService.logAudit("delete_api_key", "warn", { apiKeyId: id, path: `/api/auth/api-keys/${id}`, method: "DELETE" });
  },

  revokeKey: async (id: string) => {
    await db.update(apiKeys).set({ isActive: 0 }).where(eq(apiKeys.id, id));
    await auditService.logAudit("revoke_api_key", "warn", { apiKeyId: id, path: `/api/auth/api-keys/${id}/revoke`, method: "POST" });
  }
};
export default apiKeyService;
