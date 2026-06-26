-- 0003_add_contact_group_message_tables.sql
--> statement-breakpoint
CREATE TABLE contacts (
	id TEXT PRIMARY KEY NOT NULL,
	session_id TEXT,
	name TEXT NOT NULL,
	push_name TEXT,
	phone TEXT NOT NULL,
	is_whatsapp_user INTEGER DEFAULT 1 NOT NULL,
	labels TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE groups (
	id TEXT PRIMARY KEY NOT NULL,
	session_id TEXT,
	group_jid TEXT NOT NULL UNIQUE,
	name TEXT,
	description TEXT,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE group_participants (
	id TEXT PRIMARY KEY NOT NULL,
	group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
	participant_jid TEXT NOT NULL,
	is_admin INTEGER DEFAULT 0 NOT NULL,
	joined_at INTEGER
);
--> statement-breakpoint
CREATE TABLE messages (
	id TEXT PRIMARY KEY NOT NULL,
	message_id TEXT NOT NULL UNIQUE,
	session_id TEXT NOT NULL,
	chat_id TEXT NOT NULL,
	from_me INTEGER NOT NULL,
	sender TEXT,
	type TEXT NOT NULL,
	body TEXT,
	caption TEXT,
	media_url TEXT,
	timestamp INTEGER NOT NULL,
	received_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE settings (
	id TEXT PRIMARY KEY NOT NULL,
	key TEXT NOT NULL UNIQUE,
	value TEXT,
	updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE campaigns (
	id TEXT PRIMARY KEY NOT NULL,
	name TEXT NOT NULL,
	message_template_id TEXT REFERENCES message_templates(id),
	status TEXT NOT NULL DEFAULT 'draft',
	scheduled_at INTEGER,
	started_at INTEGER,
	finished_at INTEGER,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE campaign_recipients (
	id TEXT PRIMARY KEY NOT NULL,
	campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
	contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
	status TEXT NOT NULL DEFAULT 'pending',
	attempted_at INTEGER,
	completed_at INTEGER
);
