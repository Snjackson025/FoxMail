ALTER TABLE accounts ADD COLUMN signature TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN auto_reply_enabled INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN auto_reply_subject TEXT NOT NULL DEFAULT 'Out of office';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN auto_reply_body TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL DEFAULT 'mail',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  account_id INTEGER,
  related_id INTEGER,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
