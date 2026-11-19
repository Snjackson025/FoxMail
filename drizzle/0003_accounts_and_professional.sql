CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'work',
  organization TEXT NOT NULL DEFAULT '',
  incoming_protocol TEXT NOT NULL DEFAULT 'none',
  incoming_server TEXT NOT NULL DEFAULT '',
  incoming_port INTEGER NOT NULL DEFAULT 993,
  incoming_username TEXT NOT NULL DEFAULT '',
  incoming_password TEXT NOT NULL DEFAULT '',
  incoming_use_tls INTEGER NOT NULL DEFAULT 1,
  smtp_server TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_username TEXT NOT NULL DEFAULT '',
  smtp_password TEXT NOT NULL DEFAULT '',
  smtp_use_tls INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
ALTER TABLE messages ADD COLUMN account_id INTEGER;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN account_id INTEGER;
