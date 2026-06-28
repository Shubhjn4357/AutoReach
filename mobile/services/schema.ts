import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Re-export shared tables to use unified schema
export {
  users,
  leads,
  tasks,
  driveFiles,
  syncQueue,
  contacts,
  groups,
  groupParticipants,
  messages,
  settings,
  campaigns,
  campaignRecipients,
} from "../../shared/db";

export const sentMessagesLog = sqliteTable("sent_messages_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  status: text("status").notNull(),
  timestamp: integer("timestamp").notNull(),
});

export const messageTemplates = sqliteTable("message_templates", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const whatsappOutbox = sqliteTable("whatsapp_outbox", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  recipientPhone: text("recipient_phone").notNull(),
  messageBody: text("message_body").notNull(),
  mediaUri: text("media_uri"),
  status: text("status").default("PENDING").notNull(),
  errorMessage: text("error_message"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
