import { db } from "../../shared/dbClient";
import { messageTemplates } from "../../shared/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const templateService = {
  listTemplates: async (sessionId?: string) => {
    if (sessionId) {
      return db.select().from(messageTemplates).where(eq(messageTemplates.sessionId, sessionId));
    }
    return db.select().from(messageTemplates);
  },

  createTemplate: async (sessionId: string, name: string, body: string, header?: string, footer?: string) => {
    const id = `tpl_${crypto.randomUUID()}`;
    await db.insert(messageTemplates).values({
      id,
      sessionId,
      name,
      body,
      header: header || undefined,
      footer: footer || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { id, sessionId, name, body, header, footer, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  },

  deleteTemplate: async (id: string) => {
    await db.delete(messageTemplates).where(eq(messageTemplates.id, id));
  }
};
export default templateService;
