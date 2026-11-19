import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const accounts = sqliteTable("accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull().default(""),
  email: text("email").notNull(),
  type: text("type", { enum: ["work", "personal", "professional"] }).notNull().default("work"),
  organization: text("organization").notNull().default(""),
  incomingProtocol: text("incoming_protocol", { enum: ["imap", "pop3", "none"] }).notNull().default("none"),
  incomingServer: text("incoming_server").notNull().default(""),
  incomingPort: integer("incoming_port").notNull().default(993),
  incomingUsername: text("incoming_username").notNull().default(""),
  incomingPassword: text("incoming_password").notNull().default(""),
  incomingUseTls: integer("incoming_use_tls", { mode: "boolean" }).notNull().default(true),
  smtpServer: text("smtp_server").notNull().default(""),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUsername: text("smtp_username").notNull().default(""),
  smtpPassword: text("smtp_password").notNull().default(""),
  smtpUseTls: integer("smtp_use_tls", { mode: "boolean" }).notNull().default(true),
  avatarBlobKey: text("avatar_blob_key").notNull().default(""),
  signature: text("signature").notNull().default(""),
  autoReplyEnabled: integer("auto_reply_enabled", { mode: "boolean" }).notNull().default(false),
  autoReplySubject: text("auto_reply_subject").notNull().default("Out of office"),
  autoReplyBody: text("auto_reply_body").notNull().default(""),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id"),
  folder: text("folder", { enum: ["inbox","sent","drafts","archive","junk","trash","starred"] }).notNull().default("inbox"),
  category: text("category", { enum: ["work","personal","professional"] }).notNull().default("work"),
  fromName: text("from_name").notNull().default("Me"),
  fromEmail: text("from_email").notNull().default("me@foxmail"),
  toRecipients: text("to_recipients").notNull().default(""),
  ccRecipients: text("cc_recipients").notNull().default(""),
  subject: text("subject").notNull().default("(No subject)"),
  body: text("body").notNull().default(""),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  isStarred: integer("is_starred", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  startAt: integer("start_at", { mode: "timestamp_ms" }).notNull(),
  endAt: integer("end_at", { mode: "timestamp_ms" }).notNull(),
  allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  category: text("category", { enum: ["work","personal","professional"] }).notNull().default("work"),
  color: text("color").notNull().default("#EA580C"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  text: text("text").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind", { enum: ["mail", "calendar", "system"] }).notNull().default("mail"),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  accountId: integer("account_id"),
  relatedId: integer("related_id"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});
