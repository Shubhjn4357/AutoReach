
CREATE TABLE whatsapp_auth (
	id text PRIMARY KEY NOT NULL,
	session_id text NOT NULL,
	category text NOT NULL,
	key_id text NOT NULL,
	alue text NOT NULL,
	updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE whatsapp_sessions (
	id text PRIMARY KEY NOT NULL,
	status text DEFAULT 'DISCONNECTED' NOT NULL,
	qr_code text,
	phone_number text,
	push_name text,
	updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE webhooks (
	id text PRIMARY KEY NOT NULL,
	session_id text NOT NULL,
	url text NOT NULL,
	events text NOT NULL,
	ctive integer DEFAULT 1 NOT NULL,
	secret text,
	created_at integer NOT NULL,
	updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE message_templates (
	id text PRIMARY KEY NOT NULL,
	session_id text NOT NULL,
	
ame text NOT NULL,
	ody text NOT NULL,
	header text,
	ooter text,
	created_at integer NOT NULL,
	updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE pi_keys (
	id text PRIMARY KEY NOT NULL,
	
ame text NOT NULL,
	key_prefix text NOT NULL,
	pi_key_hash text NOT NULL,
	ole text DEFAULT 'operator' NOT NULL,
	is_active integer DEFAULT 1 NOT NULL,
	usage_count integer DEFAULT 0 NOT NULL,
	expires_at integer,
	last_used_at integer,
	created_at integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE udit_logs (
	id text PRIMARY KEY NOT NULL,
	ction text NOT NULL,
	severity text DEFAULT 'info' NOT NULL,
	pi_key_id text,
	pi_key_name text,
	session_id text,
	session_name text,
	ip_address text,
	method text,
	path text,
	status_code integer,
	error_message text,
	created_at integer NOT NULL
);
