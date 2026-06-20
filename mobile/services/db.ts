import * as SQLite from "expo-sqlite";
import { Lead, Task, SyncOperation } from "../../shared/types";

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

interface RawSqlLead {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  value: number;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

interface RawSqlTask {
  id: string;
  user_id: string | null;
  lead_id: string | null;
  title: string;
  description: string | null;
  status: "PENDING" | "COMPLETED";
  due_date: number | null;
  created_at: number;
}

interface RawSqlDriveFile {
  id: string;
  user_id: string | null;
  lead_id: string | null;
  file_id: string;
  name: string;
  mime_type: string;
  size: number;
  web_view_link: string | null;
  created_at: number;
}

interface RawSqlSyncQueue {
  id: number;
  table: "leads" | "tasks";
  operation: "CREATE" | "UPDATE" | "DELETE";
  record_id: string;
  payload: string;
  created_at: number;
  attempts: number;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("autoreach.db");
  }
  return dbInstance;
}

export async function initDb() {
  const db = await getDb();
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      google_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      status TEXT DEFAULT 'NEW' NOT NULL,
      value INTEGER DEFAULT 0 NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      lead_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      due_date INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS drive_files (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      lead_id TEXT,
      file_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      web_view_link TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // Ensure sync_queue table has attempts column
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      "table" TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      attempts INTEGER DEFAULT 0 NOT NULL
    );
  `);

  console.log("Local SQLite tables initialized.");
}

export async function getLocalLeads(): Promise<Lead[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSqlLead>("SELECT * FROM leads ORDER BY created_at DESC");
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    status: r.status as Lead["status"],
    value: r.value,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  }));
}

export async function createLocalLead(lead: Lead) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO leads (id, user_id, name, email, phone, status, value, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lead.id,
      lead.userId,
      lead.name,
      lead.email,
      lead.phone,
      lead.status,
      lead.value,
      lead.notes,
      typeof lead.createdAt === "number" ? lead.createdAt : Date.now(),
      typeof lead.updatedAt === "number" ? lead.updatedAt : Date.now()
    ]
  );

  await enqueueSyncOperation("leads", "CREATE", lead.id, lead as unknown as Record<string, unknown>);
}

export async function updateLocalLead(lead: Lead) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE leads SET name = ?, email = ?, phone = ?, status = ?, value = ?, notes = ?, updated_at = ? WHERE id = ?`,
    [
      lead.name,
      lead.email,
      lead.phone,
      lead.status,
      lead.value,
      lead.notes,
      Date.now(),
      lead.id
    ]
  );
  await enqueueSyncOperation("leads", "UPDATE", lead.id, lead as unknown as Record<string, unknown>);
}

export async function deleteLocalLead(id: string) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM leads WHERE id = ?`, [id]);
  await enqueueSyncOperation("leads", "DELETE", id, { id });
}

// Tasks Helpers
export async function getLocalTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSqlTask>("SELECT * FROM tasks ORDER BY created_at DESC");
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    leadId: r.lead_id,
    title: r.title,
    description: r.description,
    status: r.status as Task["status"],
    dueDate: r.due_date,
    createdAt: r.created_at
  }));
}

export async function createLocalTask(task: Task) {
  const db = await getDb();
  const bindDueDate = task.dueDate instanceof Date 
    ? task.dueDate.getTime() 
    : typeof task.dueDate === "string" 
      ? new Date(task.dueDate).getTime() 
      : task.dueDate || null;

  const bindCreatedAt = task.createdAt instanceof Date 
    ? task.createdAt.getTime() 
    : typeof task.createdAt === "string" 
      ? new Date(task.createdAt).getTime() 
      : task.createdAt || Date.now();

  await db.runAsync(
    `INSERT INTO tasks (id, user_id, lead_id, title, description, status, due_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.userId,
      task.leadId,
      task.title,
      task.description,
      task.status || "PENDING",
      bindDueDate,
      bindCreatedAt
    ]
  );
  await enqueueSyncOperation("tasks", "CREATE", task.id, task as unknown as Record<string, unknown>);
}

export async function updateLocalTaskStatus(id: string, status: "PENDING" | "COMPLETED") {
  const db = await getDb();
  await db.runAsync(`UPDATE tasks SET status = ? WHERE id = ?`, [status, id]);
  
  const task = await db.getFirstAsync<RawSqlTask>(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (task) {
    await enqueueSyncOperation("tasks", "UPDATE", id, {
      id: task.id,
      userId: task.user_id,
      leadId: task.lead_id,
      title: task.title,
      description: task.description,
      status: status,
      dueDate: task.due_date,
      createdAt: task.created_at
    } as unknown as Record<string, unknown>);
  }
}

export async function deleteLocalTask(id: string) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  await enqueueSyncOperation("tasks", "DELETE", id, { id });
}

// Drive Files Helpers
export async function getLocalDriveFiles(): Promise<DriveFile[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSqlDriveFile>("SELECT * FROM drive_files ORDER BY created_at DESC");
  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    leadId: r.lead_id,
    fileId: r.file_id,
    name: r.name,
    mimeType: r.mime_type,
    size: r.size,
    webViewLink: r.web_view_link,
    createdAt: r.created_at
  }));
}

export async function createLocalDriveFile(file: DriveFile) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO drive_files (id, user_id, lead_id, file_id, name, mime_type, size, web_view_link, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      file.id,
      file.userId,
      file.leadId,
      file.fileId,
      file.name,
      file.mimeType,
      file.size,
      file.webViewLink || null,
      file.createdAt || Date.now()
    ]
  );
}

// Sync Queue Helpers
export async function enqueueSyncOperation(
  table: "leads" | "tasks",
  operation: "CREATE" | "UPDATE" | "DELETE",
  recordId: string,
  payload: Record<string, unknown>
) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sync_queue ("table", operation, record_id, payload, created_at, attempts)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [table, operation, recordId, JSON.stringify(payload), Date.now()]
  );
  console.log(`Enqueued sync operation: ${operation} on ${table}`);
}

export async function getQueuedOperations(): Promise<SyncOperation[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RawSqlSyncQueue>('SELECT * FROM sync_queue ORDER BY id ASC');
  return rows.map(r => ({
    id: r.id,
    table: r.table,
    operation: r.operation,
    recordId: r.record_id,
    payload: r.payload,
    createdAt: r.created_at,
    attempts: r.attempts || 0
  }));
}

export async function incrementSyncAttempt(id: number) {
  const db = await getDb();
  await db.runAsync("UPDATE sync_queue SET attempts = attempts + 1 WHERE id = ?", [id]);
}

export async function dequeueSyncOperation(id: number) {
  const db = await getDb();
  await db.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
}

