DROP TABLE IF EXISTS entries;
--> statement-breakpoint
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder TEXT NOT NULL DEFAULT 'inbox',
  category TEXT NOT NULL DEFAULT 'work',
  from_name TEXT NOT NULL DEFAULT 'Me',
  from_email TEXT NOT NULL DEFAULT 'me@foxmail',
  to_recipients TEXT NOT NULL DEFAULT '',
  cc_recipients TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '(No subject)',
  body TEXT NOT NULL DEFAULT '',
  is_read INTEGER NOT NULL DEFAULT 0,
  is_starred INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  start_at INTEGER NOT NULL,
  end_at INTEGER NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'work',
  color TEXT NOT NULL DEFAULT '#EA580C',
  created_at INTEGER NOT NULL
);
