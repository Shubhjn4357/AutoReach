CREATE TABLE `api_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`api_key_hash` text NOT NULL,
	`role` text DEFAULT 'operator' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`usage_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`last_used_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`api_key_id` text,
	`api_key_name` text,
	`session_id` text,
	`session_name` text,
	`ip_address` text,
	`method` text,
	`path` text,
	`status_code` integer,
	`error_message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `campaign_recipients` (
	`id` text PRIMARY KEY NOT NULL,
	`campaign_id` text NOT NULL,
	`contact_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempted_at` integer,
	`completed_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`message_template_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`media_url` text,
	`scheduled_at` integer,
	`started_at` integer,
	`finished_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`message_template_id`) REFERENCES `message_templates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`name` text NOT NULL,
	`push_name` text,
	`phone` text NOT NULL,
	`is_whatsapp_user` integer DEFAULT 1 NOT NULL,
	`labels` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `group_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`participant_jid` text NOT NULL,
	`is_admin` integer DEFAULT 0 NOT NULL,
	`joined_at` integer,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`group_jid` text NOT NULL,
	`name` text,
	`description` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `groups_group_jid_unique` ON `groups` (`group_jid`);--> statement-breakpoint
CREATE TABLE `message_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`header` text,
	`footer` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`session_id` text NOT NULL,
	`chat_id` text NOT NULL,
	`from_me` integer NOT NULL,
	`sender` text,
	`type` text NOT NULL,
	`body` text,
	`caption` text,
	`media_url` text,
	`timestamp` integer NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messages_message_id_unique` ON `messages` (`message_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`url` text NOT NULL,
	`events` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`secret` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
