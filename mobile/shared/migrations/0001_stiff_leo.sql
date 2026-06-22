CREATE TABLE `whatsapp_auth` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`category` text NOT NULL,
	`key_id` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `whatsapp_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'DISCONNECTED' NOT NULL,
	`qr_code` text,
	`phone_number` text,
	`push_name` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `password_hash` text;