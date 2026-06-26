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

export const whatsappAuth = sqliteTable("whatsapp_auth", {
  id: text("id").primaryKey(), // session_id:category:key_id
  sessionId: text("session_id").notNull(),
  category: text("category").notNull(),
  keyId: text("key_id").notNull(),
  value: text("value").notNull(), // JSON string
  updatedAt: integer("updated_at").notNull(),
});

export const whatsappSessions = sqliteTable("whatsapp_sessions", {
  id: text("id").primaryKey(), // session_id
  status: text("status").default("DISCONNECTED").notNull(),
  qrCode: text("qr_code"), // data URL for QR png
  phoneNumber: text("phone_number"),
  pushName: text("push_name"),
  updatedAt: integer("updated_at").notNull(),
});

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  url: text("url").notNull(),
  events: text("events").notNull(), // JSON string array of events
  active: integer("active").default(1).notNull(), // 0 or 1
  secret: text("secret"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const messageTemplates = sqliteTable("message_templates", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  name: text("name").notNull(),
  body: text("body").notNull(),
  header: text("header"),
  footer: text("footer"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  apiKeyHash: text("api_key_hash").notNull(),
  role: text("role").default("operator").notNull(), // 'admin' | 'operator' | 'viewer'
  isActive: integer("is_active").default(1).notNull(), // 0 or 1
  usageCount: integer("usage_count").default(0).notNull(),
  expiresAt: integer("expires_at"),
  lastUsedAt: integer("last_used_at"),
  createdAt: integer("created_at").notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  action: text("action").notNull(),
  severity: text("severity").default("info").notNull(), // 'info' | 'warn' | 'error'
  apiKeyId: text("api_key_id"),
  apiKeyName: text("api_key_name"),
  sessionId: text("session_id"),
  sessionName: text("session_name"),
  ipAddress: text("ip_address"),
  method: text("method"),
  path: text("path"),
  statusCode: integer("status_code"),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull(),
});
export const contacts = sqliteTable("contacts", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  name: text("name").notNull(),
  pushName: text("push_name"),
  phone: text("phone").notNull(),
  isWhatsappUser: integer("is_whatsapp_user").default(1).notNull(),
  labels: text("labels"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  sessionId: text("session_id"),
  groupJid: text("group_jid").notNull().unique(),
  name: text("name"),
  description: text("description"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const groupParticipants = sqliteTable("group_participants", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .references(() => groups.id)
    .notNull(),
  participantJid: text("participant_jid").notNull(),
  isAdmin: integer("is_admin").default(0).notNull(),
  joinedAt: integer("joined_at"),
});

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  messageId: text("message_id").notNull().unique(),
  sessionId: text("session_id").notNull(),
  chatId: text("chat_id").notNull(),
  fromMe: integer("from_me").notNull(),
  sender: text("sender"),
  type: text("type").notNull(),
  body: text("body"),
  caption: text("caption"),
  mediaUrl: text("media_url"),
  timestamp: integer("timestamp").notNull(),
  receivedAt: integer("received_at").notNull(),
});

export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  updatedAt: integer("updated_at").notNull(),
});

export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  messageTemplateId: text("message_template_id").references(() => messageTemplates.id),
  status: text("status").notNull().default("draft"),
  scheduledAt: integer("scheduled_at"),
  startedAt: integer("started_at"),
  finishedAt: integer("finished_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const campaignRecipients = sqliteTable("campaign_recipients", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  contactId: text("contact_id")
    .references(() => contacts.id)
    .notNull(),
  status: text("status").notNull().default("pending"),
  attemptedAt: integer("attempted_at"),
  completedAt: integer("completed_at"),
});
