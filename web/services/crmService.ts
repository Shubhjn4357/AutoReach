import { db } from "../../shared/dbClient";
import { leads, tasks } from "../../shared/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { SyncOperation } from "../../shared/types";

export const crmService = {
  listLeads: async (userId?: string) => {
    if (userId) {
      return db.select().from(leads).where(eq(leads.userId, userId));
    }
    return db.select().from(leads);
  },

  createLead: async (name: string, email?: string, phone?: string, status?: string, value?: number, notes?: string, userId?: string) => {
    const id = `lead_${crypto.randomUUID()}`;
    const now = Date.now();
    const newLead = {
      id,
      userId: userId || null,
      name,
      email: email || null,
      phone: phone || null,
      status: status || "NEW",
      value: Number(value) || 0,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(leads).values(newLead);
    return newLead;
  },

  updateLead: async (id: string, name: string, email?: string, phone?: string, status?: string, value?: number, notes?: string) => {
    await db.update(leads).set({
      name,
      email: email ?? null,
      phone: phone ?? null,
      status: status ?? "NEW",
      value: Number(value) ?? 0,
      notes: notes ?? null,
      updatedAt: Date.now(),
    }).where(eq(leads.id, id));
  },

  deleteLead: async (id: string) => {
    await db.delete(leads).where(eq(leads.id, id));
  },

  listTasks: async (userId?: string) => {
    if (userId) {
      return db.select().from(tasks).where(eq(tasks.userId, userId));
    }
    return db.select().from(tasks);
  },

  createTask: async (leadId: string | null, title: string, description?: string, status?: string, dueDate?: number, userId?: string) => {
    const id = `task_${crypto.randomUUID()}`;
    const now = Date.now();
    const newTask = {
      id,
      userId: userId || null,
      leadId: leadId || null,
      title,
      description: description || null,
      status: status || "PENDING",
      dueDate: dueDate ? new Date(dueDate).getTime() : null,
      createdAt: now,
    };
    await db.insert(tasks).values(newTask);
    return newTask;
  },

  syncOperations: async (operations: Omit<SyncOperation, "id">[], defaultUserId: string | null) => {
    const syncedIds: string[] = [];
    const errors: { recordId: string; error: string }[] = [];

    for (const op of operations) {
      try {
        const payload = typeof op.payload === "string" ? JSON.parse(op.payload) : op.payload;
        const userId = defaultUserId;

        if (op.table === "leads") {
          if (op.operation === "CREATE" || op.operation === "UPDATE") {
            const createdAtVal = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now();
            const updatedAtVal = payload.updatedAt ? new Date(payload.updatedAt).getTime() : Date.now();
            await db
              .insert(leads)
              .values({
                id: op.recordId,
                userId,
                name: payload.name || "Unnamed Lead",
                email: payload.email || null,
                phone: payload.phone || null,
                status: payload.status || "NEW",
                value: Number(payload.value) || 0,
                notes: payload.notes || null,
                createdAt: createdAtVal,
                updatedAt: updatedAtVal,
              })
              .onConflictDoUpdate({
                target: leads.id,
                set: {
                  name: payload.name || "Unnamed Lead",
                  email: payload.email || null,
                  phone: payload.phone || null,
                  status: payload.status || "NEW",
                  value: Number(payload.value) || 0,
                  notes: payload.notes || null,
                  updatedAt: updatedAtVal,
                },
              });
          } else if (op.operation === "DELETE") {
            await db.delete(leads).where(eq(leads.id, op.recordId));
          }
        } else if (op.table === "tasks") {
          if (op.operation === "CREATE" || op.operation === "UPDATE") {
            const createdAtVal = payload.createdAt ? new Date(payload.createdAt).getTime() : Date.now();
            const resolvedDueDate = payload.dueDate ? new Date(payload.dueDate).getTime() : null;
            await db
              .insert(tasks)
              .values({
                id: op.recordId,
                userId,
                leadId: payload.leadId || null,
                title: payload.title || "Unnamed Task",
                description: payload.description || null,
                status: payload.status || "PENDING",
                dueDate: resolvedDueDate,
                createdAt: createdAtVal,
              })
              .onConflictDoUpdate({
                target: tasks.id,
                set: {
                  leadId: payload.leadId || null,
                  title: payload.title || "Unnamed Task",
                  description: payload.description || null,
                  status: payload.status || "PENDING",
                  dueDate: resolvedDueDate,
                },
              });
          } else if (op.operation === "DELETE") {
            await db.delete(tasks).where(eq(tasks.id, op.recordId));
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
