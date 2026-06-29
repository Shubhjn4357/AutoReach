export const migrationStatements = [
  // 1. users
  `CREATE TABLE IF NOT EXISTS \`users\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`email\` text NOT NULL,
\t\`name\` text,
\t\`google_id\` text,
\t\`password_hash\` text,
\t\`organization_id\` text,
\t\`role\` text DEFAULT 'MEMBER' NOT NULL,
\t\`created_at\` integer NOT NULL
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS \`users_email_unique\` ON \`users\` (\`email\`);`,

  // 2. leads
  `CREATE TABLE IF NOT EXISTS \`leads\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`user_id\` text,
\t\`name\` text NOT NULL,
\t\`email\` text,
\t\`phone\` text,
\t\`status\` text DEFAULT 'NEW' NOT NULL,
\t\`value\` integer DEFAULT 0 NOT NULL,
\t\`notes\` text,
\t\`created_at\` integer NOT NULL,
\t\`updated_at\` integer NOT NULL,
\tFOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action
  );`,

  // 3. tasks
  `CREATE TABLE IF NOT EXISTS \`tasks\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`user_id\` text,
\t\`lead_id\` text,
\t\`title\` text NOT NULL,
\t\`description\` text,
\t\`status\` text DEFAULT 'PENDING' NOT NULL,
\t\`due_date\` integer,
\t\`created_at\` integer NOT NULL,
\tFOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action,
\tFOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE no action
  );`,

  // 4. drive_files
  `CREATE TABLE IF NOT EXISTS \`drive_files\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`user_id\` text,
\t\`lead_id\` text,
\t\`file_id\` text NOT NULL,
\t\`name\` text NOT NULL,
\t\`mime_type\` text NOT NULL,
\t\`size\` integer NOT NULL,
\t\`web_view_link\` text,
\t\`created_at\` integer NOT NULL,
\tFOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE no action,
\tFOREIGN KEY (\`lead_id\`) REFERENCES \`leads\`(\`id\`) ON UPDATE no action ON DELETE no action
  );`,

  // 5. sync_queue
  `CREATE TABLE IF NOT EXISTS \`sync_queue\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`table\` text NOT NULL,
\t\`operation\` text NOT NULL,
\t\`record_id\` text NOT NULL,
\t\`payload\` text NOT NULL,
\t\`created_at\` integer NOT NULL,
\t\`attempts\` integer DEFAULT 0 NOT NULL
  );`,

  // 6. sent_messages_log
  `CREATE TABLE IF NOT EXISTS \`sent_messages_log\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`channel\` text NOT NULL,
\t\`recipient_phone\` text NOT NULL,
\t\`status\` text NOT NULL,
\t\`timestamp\` integer NOT NULL
  );`,

  // 7. message_templates
  `CREATE TABLE IF NOT EXISTS \`message_templates\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`title\` text NOT NULL,
\t\`body\` text NOT NULL,
\t\`created_at\` integer NOT NULL
  );`,

  // 8. whatsapp_outbox
  `CREATE TABLE IF NOT EXISTS \`whatsapp_outbox\` (
\t\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
\t\`recipient_phone\` text NOT NULL,
\t\`message_body\` text NOT NULL,
\t\`media_uri\` text,
\t\`status\` text DEFAULT 'PENDING' NOT NULL,
\t\`error_message\` text,
\t\`created_at\` integer NOT NULL,
\t\`updated_at\` integer NOT NULL
  );`,

  // 9. contacts
  `CREATE TABLE IF NOT EXISTS \`contacts\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`session_id\` text,
\t\`name\` text NOT NULL,
\t\`push_name\` text,
\t\`phone\` text NOT NULL,
\t\`is_whatsapp_user\` integer DEFAULT 1 NOT NULL,
\t\`labels\` text,
\t\`created_at\` integer NOT NULL,
\t\`updated_at\` integer NOT NULL
  );`,

  // 10. groups
  `CREATE TABLE IF NOT EXISTS \`groups\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`session_id\` text,
\t\`group_jid\` text NOT NULL,
\t\`name\` text,
\t\`description\` text,
\t\`created_at\` integer NOT NULL,
\t\`updated_at\` integer NOT NULL
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS \`groups_group_jid_unique\` ON \`groups\` (\`group_jid\`);`,

  // 11. group_participants
  `CREATE TABLE IF NOT EXISTS \`group_participants\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`group_id\` text NOT NULL,
\t\`participant_jid\` text NOT NULL,
\t\`is_admin\` integer DEFAULT 0 NOT NULL,
\t\`joined_at\` integer,
\tFOREIGN KEY (\`group_id\`) REFERENCES \`groups\`(\`id\`) ON UPDATE no action ON DELETE no action
  );`,

  // 12. messages
  `CREATE TABLE IF NOT EXISTS \`messages\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`message_id\` text NOT NULL,
\t\`session_id\` text NOT NULL,
\t\`chat_id\` text NOT NULL,
\t\`from_me\` integer NOT NULL,
\t\`sender\` text,
\t\`type\` text NOT NULL,
\t\`body\` text,
\t\`caption\` text,
\t\`media_url\` text,
\t\`timestamp\` integer NOT NULL,
\t\`received_at\` integer NOT NULL
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS \`messages_message_id_unique\` ON \`messages\` (\`message_id\`);`,

  // 13. settings
  `CREATE TABLE IF NOT EXISTS \`settings\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`key\` text NOT NULL,
\t\`value\` text,
\t\`updated_at\` integer NOT NULL
  );`,

  `CREATE UNIQUE INDEX IF NOT EXISTS \`settings_key_unique\` ON \`settings\` (\`key\`);`,

  // 14. campaigns
  `CREATE TABLE IF NOT EXISTS \`campaigns\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`name\` text NOT NULL,
\t\`message_template_id\` text,
\t\`status\` text DEFAULT 'draft' NOT NULL,
\t\`media_url\` text,
\t\`scheduled_at\` integer,
\t\`started_at\` integer,
\t\`finished_at\` integer,
\t\`created_at\` integer NOT NULL,
\t\`updated_at\` integer NOT NULL,
\tFOREIGN KEY (\`message_template_id\`) REFERENCES \`message_templates\`(\`id\`) ON UPDATE no action ON DELETE no action
  );`,

  // 15. campaign_recipients
  `CREATE TABLE IF NOT EXISTS \`campaign_recipients\` (
\t\`id\` text PRIMARY KEY NOT NULL,
\t\`campaign_id\` text NOT NULL,
\t\`phone\` text NOT NULL,
\t\`name\` text,
\t\`status\` text DEFAULT 'pending' NOT NULL,
\t\`attempted_at\` integer,
\t\`completed_at\` integer,
\tFOREIGN KEY (\`campaign_id\`) REFERENCES \`campaigns\`(\`id\`) ON UPDATE no action ON DELETE no action
  );`,

  // 16. Indexes
  `CREATE INDEX IF NOT EXISTS \`leads_status_idx\` ON \`leads\` (\`status\`);`,
  `CREATE INDEX IF NOT EXISTS \`leads_phone_idx\` ON \`leads\` (\`phone\`);`,
  `CREATE INDEX IF NOT EXISTS \`campaign_recipients_phone_idx\` ON \`campaign_recipients\` (\`phone\`);`,
  `CREATE INDEX IF NOT EXISTS \`campaign_recipients_campaign_id_idx\` ON \`campaign_recipients\` (\`campaign_id\`);`
];
