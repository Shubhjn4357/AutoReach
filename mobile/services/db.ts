import * as SQLite from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
import { desc, eq, sql, count, type InferSelectModel } from "drizzle-orm";
import { Lead, Task, SyncOperation } from "../../shared/types";
import * as schema from "./schema";
import { migrationStatements } from "../drizzle/migrations";

export interface DriveFile {
  id: string;
  userId: string | null;
  leadId: string | null;
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string | null;
  createdAt: number;
}

export interface MessageTemplate {
  id: string;
  title: string;
  body: string;
  createdAt: number;
}

export interface QueuedMessage {
  id: number;
  recipientPhone: string;
  messageBody: string;
  mediaUri: string | null;
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface MessageStats {
  totalSent: number;
  whatsappCount: number;
  smsCount: number;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;
let drizzleDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("autoreach.db");
    await dbInstance.execAsync("PRAGMA journal_mode = WAL;");
  }
  return dbInstance;
}

export function getDrizzle() {
  if (!drizzleDb) {
    if (dbInstance) {
      drizzleDb = drizzle(dbInstance, { schema });
    } else {
      const sqlite = SQLite.openDatabaseSync("autoreach.db");
      sqlite.execSync("PRAGMA journal_mode = WAL;");
      dbInstance = sqlite;
      drizzleDb = drizzle(sqlite, { schema });
    }
  }
  return drizzleDb;
}

export async function initDb(db?: SQLite.SQLiteDatabase) {
  if (db) {
    dbInstance = db;
    drizzleDb = drizzle(db, { schema });
  } else {
    db = await getDb();
    drizzleDb = drizzle(db, { schema });
  }

  await db.execAsync("PRAGMA journal_mode = WAL;");

  // Initialize SQLite database tables using Drizzle schema-generated migration statements
  for (const statement of migrationStatements) {
    if (statement.trim()) {
      await db.execAsync(statement);
    }
  }

  try {
    await db.execAsync("ALTER TABLE whatsapp_outbox ADD COLUMN media_uri TEXT;");
  } catch {
    // Column already exists
  }
  console.log("Local SQLite tables initialized using Drizzle Schema.");
}

// Leads Helpers
export async function getLocalLeads(): Promise<Lead[]> {
  const db = getDrizzle();
  const rows = (await db.select().from(schema.leads).orderBy(desc(schema.leads.createdAt))) as unknown as Array<InferSelectModel<typeof schema.leads>>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status as Lead["status"],
    value: r.value,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function getLocalLead(id: string): Promise<Lead | null> {
  if (!id) return null;
  const db = getDrizzle();
  const rows = (await db.select().from(schema.leads).where(eq(schema.leads.id, id)).limit(1)) as unknown as Array<InferSelectModel<typeof schema.leads>>;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    userId: r.userId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status as Lead["status"],
    value: r.value,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createLocalLead(lead: Lead) {
  const db = getDrizzle();
  await db.insert(schema.leads).values({
    id: lead.id,
    userId: lead.userId,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    value: lead.value,
    notes: lead.notes,
    createdAt: typeof lead.createdAt === "number" ? lead.createdAt : Date.now(),
    updatedAt: typeof lead.updatedAt === "number" ? lead.updatedAt : Date.now(),
  });

  await enqueueSyncOperation(
    "leads",
    "CREATE",
    lead.id,
    lead as unknown as Record<string, unknown>,
  );
}

export async function updateLocalLead(lead: Lead) {
  const db = getDrizzle();
  await db.update(schema.leads)
    .set({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      value: lead.value,
      notes: lead.notes,
      updatedAt: Date.now(),
    })
    .where(eq(schema.leads.id, lead.id));

  await enqueueSyncOperation(
    "leads",
    "UPDATE",
    lead.id,
    lead as unknown as Record<string, unknown>,
  );
}

export async function deleteLocalLead(id: string) {
  const db = getDrizzle();
  await db.delete(schema.leads).where(eq(schema.leads.id, id));
  await enqueueSyncOperation("leads", "DELETE", id, { id });
}

// Tasks Helpers
export async function getLocalTasks(): Promise<Task[]> {
  const db = getDrizzle();
  const rows = (await db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt))) as unknown as Array<InferSelectModel<typeof schema.tasks>>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    leadId: r.leadId,
    title: r.title,
    description: r.description || null,
    status: r.status as Task["status"],
    dueDate: r.dueDate,
    createdAt: r.createdAt,
  }));
}

export async function createLocalTask(task: Task) {
  const db = getDrizzle();
  const bindDueDate =
    task.dueDate instanceof Date
      ? task.dueDate.getTime()
      : typeof task.dueDate === "string"
        ? new Date(task.dueDate).getTime()
        : task.dueDate || null;

  const bindCreatedAt =
    task.createdAt instanceof Date
      ? task.createdAt.getTime()
      : typeof task.createdAt === "string"
        ? new Date(task.createdAt).getTime()
        : task.createdAt || Date.now();

  await db.insert(schema.tasks).values({
    id: task.id,
    userId: task.userId,
    leadId: task.leadId,
    title: task.title,
    description: task.description,
    status: task.status || "PENDING",
    dueDate: bindDueDate,
    createdAt: bindCreatedAt,
  });

  await enqueueSyncOperation(
    "tasks",
    "CREATE",
    task.id,
    task as unknown as Record<string, unknown>,
  );
}

export async function updateLocalTaskStatus(
  id: string,
  status: "PENDING" | "COMPLETED",
) {
  const db = getDrizzle();
  await db.update(schema.tasks)
    .set({ status })
    .where(eq(schema.tasks.id, id));

  const rows = (await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).limit(1)) as unknown as Array<InferSelectModel<typeof schema.tasks>>;
  const task = rows[0];
  if (task) {
    await enqueueSyncOperation("tasks", "UPDATE", id, {
      id: task.id,
      userId: task.userId,
      leadId: task.leadId,
      title: task.title,
      description: task.description,
      status: status,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
    } as unknown as Record<string, unknown>);
  }
}

export async function deleteLocalTask(id: string) {
  const db = getDrizzle();
  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));
  await enqueueSyncOperation("tasks", "DELETE", id, { id });
}

// Drive Files Helpers
export async function getLocalDriveFiles(): Promise<DriveFile[]> {
  const db = getDrizzle();
  const rows = await db.select().from(schema.driveFiles).orderBy(desc(schema.driveFiles.createdAt));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    leadId: r.leadId,
    fileId: r.fileId,
    name: r.name,
    mimeType: r.mimeType,
    size: r.size,
    webViewLink: r.webViewLink,
    createdAt: r.createdAt,
  }));
}

export async function createLocalDriveFile(file: DriveFile) {
  const db = getDrizzle();
  await db.insert(schema.driveFiles).values({
    id: file.id,
    userId: file.userId,
    leadId: file.leadId,
    fileId: file.fileId,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    webViewLink: file.webViewLink || null,
    createdAt: file.createdAt || Date.now(),
  });
}

export async function enqueueSyncOperation(
  table: "leads" | "tasks" | "campaigns",
  operation: "CREATE" | "UPDATE" | "DELETE",
  recordId: string,
  payload: Record<string, unknown>,
) {
  const db = getDrizzle();
  await db.insert(schema.syncQueue).values({
    table,
    operation,
    recordId,
    payload: JSON.stringify(payload),
    createdAt: Date.now(),
    attempts: 0,
  });
  console.log(`Enqueued sync operation: ${operation} on ${table}`);
}

export async function getQueuedOperations(): Promise<SyncOperation[]> {
  const db = getDrizzle();
  const rows = (await db.select().from(schema.syncQueue).orderBy(schema.syncQueue.id)) as unknown as Array<InferSelectModel<typeof schema.syncQueue>>;
  return rows.map((r) => ({
    id: r.id,
    table: r.table as SyncOperation["table"],
    operation: r.operation as SyncOperation["operation"],
    recordId: r.recordId,
    payload: r.payload,
    createdAt: r.createdAt,
    attempts: r.attempts,
  }));
}

export async function incrementSyncAttempt(id: number) {
  const db = getDrizzle();
  await db.update(schema.syncQueue)
    .set({ attempts: sql`${schema.syncQueue.attempts} + 1` })
    .where(eq(schema.syncQueue.id, id));
}

export async function dequeueSyncOperation(id: number) {
  const db = getDrizzle();
  await db.delete(schema.syncQueue).where(eq(schema.syncQueue.id, id));
}

// Log Sent Message
export async function logSentMessage(
  channel: string,
  phone: string,
  status: string,
) {
  const db = getDrizzle();
  await db.insert(schema.sentMessagesLog).values({
    channel,
    recipientPhone: phone,
    status,
    timestamp: Date.now(),
  });
}

export async function getSentMessageStats(): Promise<MessageStats> {
  const db = getDrizzle();
  const totalRow = await db.select({ count: count() }).from(schema.sentMessagesLog);
  const waRow = await db.select({ count: count() }).from(schema.sentMessagesLog).where(eq(schema.sentMessagesLog.channel, 'whatsapp'));
  const smsRow = await db.select({ count: count() }).from(schema.sentMessagesLog).where(eq(schema.sentMessagesLog.channel, 'sms'));
  
  return {
    totalSent: totalRow[0]?.count || 0,
    whatsappCount: waRow[0]?.count || 0,
    smsCount: smsRow[0]?.count || 0,
  };
}

// Templates Helpers
export async function getLocalTemplates(): Promise<MessageTemplate[]> {
  const db = getDrizzle();
  const rows = (await db.select().from(schema.messageTemplates).orderBy(desc(schema.messageTemplates.createdAt))) as unknown as Array<InferSelectModel<typeof schema.messageTemplates>>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    createdAt: r.createdAt,
  }));
}

export async function createLocalTemplate(
  id: string,
  title: string,
  body: string,
) {
  const db = getDrizzle();
  await db.insert(schema.messageTemplates)
    .values({
      id,
      title,
      body,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: schema.messageTemplates.id,
      set: {
        title,
        body,
        createdAt: Date.now(),
      },
    });
}

export async function deleteLocalTemplate(id: string) {
  const db = getDrizzle();
  await db.delete(schema.messageTemplates).where(eq(schema.messageTemplates.id, id));
}

export async function enqueueWhatsAppMessage(phone: string, body: string, mediaUri?: string): Promise<number> {
  const db = getDrizzle();
  const now = Date.now();
  const result = await db.insert(schema.whatsappOutbox).values({
    recipientPhone: phone,
    messageBody: body,
    mediaUri: mediaUri || null,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  });
  return (result as { lastInsertRowId: number }).lastInsertRowId;
}

export async function getPendingWhatsAppMessages(): Promise<QueuedMessage[]> {
  const db = getDrizzle();
  const rows = await db.select()
    .from(schema.whatsappOutbox)
    .where(eq(schema.whatsappOutbox.status, 'PENDING'))
    .orderBy(schema.whatsappOutbox.createdAt);
  return rows.map((r) => ({
    id: r.id,
    recipientPhone: r.recipientPhone,
    messageBody: r.messageBody,
    mediaUri: r.mediaUri,
    status: r.status as QueuedMessage["status"],
    errorMessage: r.errorMessage,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function updateWhatsAppMessageStatus(
  id: number,
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED',
  error?: string
) {
  const db = getDrizzle();
  await db.update(schema.whatsappOutbox)
    .set({
      status,
      errorMessage: error || null,
      updatedAt: Date.now(),
    })
    .where(eq(schema.whatsappOutbox.id, id));
}

export async function getWhatsAppQueueSize(): Promise<number> {
  const db = getDrizzle();
  const res = await db.select({ count: sql<number>`count(*)` })
    .from(schema.whatsappOutbox)
    .where(eq(schema.whatsappOutbox.status, 'PENDING'));
  return res[0]?.count || 0;
}

export async function createLocalLeadsBatch(leadsList: Lead[]) {
  if (leadsList.length === 0) return;
  const db = getDrizzle();
  await db.transaction(async (tx) => {
    const leadsValues = leadsList.map((lead) => ({
      id: lead.id,
      userId: lead.userId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      value: lead.value,
      notes: lead.notes,
      createdAt: typeof lead.createdAt === "number" ? lead.createdAt : Date.now(),
      updatedAt: typeof lead.updatedAt === "number" ? lead.updatedAt : Date.now(),
    }));

    const chunkSize = 100;
    for (let i = 0; i < leadsValues.length; i += chunkSize) {
      const chunk = leadsValues.slice(i, i + chunkSize);
      await tx.insert(schema.leads).values(chunk);
    }

    const syncValues = leadsList.map((lead) => ({
      table: "leads" as const,
      operation: "CREATE" as const,
      recordId: lead.id,
      payload: JSON.stringify(lead),
      createdAt: Date.now(),
      attempts: 0,
    }));

    for (let i = 0; i < syncValues.length; i += chunkSize) {
      const chunk = syncValues.slice(i, i + chunkSize);
      await tx.insert(schema.syncQueue).values(chunk);
    }
  });
  console.log(`Batch created ${leadsList.length} leads in SQLite.`);
}

export async function createLocalCampaign(campaign: {
  id: string;
  name: string;
  messageTemplateId: string | null;
  status: string;
  mediaUrl: string | null;
  scheduledAt: number | null;
  createdAt: number;
  updatedAt: number;
}, recipientIds: string[]) {
  const db = getDrizzle();
  
  // Insert campaign record
  await db.insert(schema.campaigns).values({
    id: campaign.id,
    name: campaign.name,
    messageTemplateId: campaign.messageTemplateId,
    status: campaign.status,
    mediaUrl: campaign.mediaUrl,
    scheduledAt: campaign.scheduledAt,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  });

  // Insert recipients in batch
  if (recipientIds.length > 0) {
    const batchRecipients = recipientIds.map((cid) => ({
      id: `cr_${Math.random().toString(36).substring(2, 9)}`,
      campaignId: campaign.id,
      contactId: cid,
      status: "pending",
    }));
    
    const chunkSize = 100;
    for (let i = 0; i < batchRecipients.length; i += chunkSize) {
      const chunk = batchRecipients.slice(i, i + chunkSize);
      await db.insert(schema.campaignRecipients).values(chunk);
    }
  }

  // Enqueue sync operation for backend
  await enqueueSyncOperation(
    "campaigns",
    "CREATE",
    campaign.id,
    {
      ...campaign,
      recipientIds,
    } as unknown as Record<string, unknown>
  );
}
