import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subscriptionTier: text("subscription_tier").default("FREE").notNull(),
  subscriptionStatus: text("subscription_status").default("ACTIVE").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  googleId: text("google_id"),
  passwordHash: text("password_hash"),
  organizationId: text("organization_id").references(() => organizations.id),
  role: text("role").default("MEMBER").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const leads = sqliteTable("leads", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  status: text("status").default("NEW").notNull(),
  value: integer("value").default(0).notNull(),
  notes: text("notes"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  leadId: text("lead_id").references(() => leads.id),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("PENDING").notNull(),
  dueDate: integer("due_date"),
  createdAt: integer("created_at").notNull(),
});

export const driveFiles = sqliteTable("drive_files", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  leadId: text("lead_id").references(() => leads.id),
  fileId: text("file_id").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  webViewLink: text("web_view_link"),
  createdAt: integer("created_at").notNull(),
});

export const syncQueue = sqliteTable("sync_queue", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  table: text("table").notNull(),
  operation: text("operation").notNull(),
  recordId: text("record_id").notNull(),
  payload: text("payload").notNull(),
  createdAt: integer("created_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
});
