import { defineAction, z, type ActionsModule, type Ctx } from "@hatch/space-sdk";
import { desc, asc, eq } from "drizzle-orm";
import * as schema from "./schema";

const folderEnum = z.enum(["inbox","sent","drafts","archive","junk","trash","starred"]);
const catEnum = z.enum(["work","personal","professional"]);
const acctType = z.enum(["work","personal","professional"]);
const catFilter = z.enum(["all","work","personal","professional"]);

const msgObj = z.object({
  id: z.number(), accountId: z.number().nullable(), folder: z.string(), category: z.string(),
  fromName: z.string(), fromEmail: z.string(), toRecipients: z.string(), ccRecipients: z.string(),
  subject: z.string(), body: z.string(), isRead: z.boolean(), isStarred: z.boolean(),
  createdAt: z.string(), updatedAt: z.string(),
});
const evtObj = z.object({
  id: z.number(), accountId: z.number().nullable(), title: z.string(), description: z.string(), location: z.string(),
  startAt: z.string(), endAt: z.string(), allDay: z.boolean(), category: z.string(), color: z.string(), createdAt: z.string(),
});

const acctObj = z.object({
  id: z.number(), displayName: z.string(), email: z.string(), type: z.string(), organization: z.string(),
  incomingProtocol: z.string(), incomingServer: z.string(), incomingPort: z.number(), incomingUsername: z.string(), hasIncomingPassword: z.boolean(), incomingUseTls: z.boolean(),
  smtpServer: z.string(), smtpPort: z.number(), smtpUsername: z.string(), hasSmtpPassword: z.boolean(), smtpUseTls: z.boolean(), avatarUrl: z.string().nullable(), signature: z.string(), autoReplyEnabled: z.boolean(), autoReplySubject: z.string(), autoReplyBody: z.string(), isDefault: z.boolean(), createdAt: z.string(),
});
type AcctRow = typeof schema.accounts.$inferSelect;
function toAcct(r: AcctRow, avatarUrl: string | null = null): z.infer<typeof acctObj> {
  return { id: r.id, displayName: r.displayName, email: r.email, type: r.type, organization: r.organization, incomingProtocol: r.incomingProtocol, incomingServer: r.incomingServer, incomingPort: r.incomingPort, incomingUsername: r.incomingUsername, hasIncomingPassword: !!r.incomingPassword, incomingUseTls: r.incomingUseTls, smtpServer: r.smtpServer, smtpPort: r.smtpPort, smtpUsername: r.smtpUsername, hasSmtpPassword: !!r.smtpPassword, smtpUseTls: r.smtpUseTls, avatarUrl, signature: r.signature, autoReplyEnabled: r.autoReplyEnabled, autoReplySubject: r.autoReplySubject, autoReplyBody: r.autoReplyBody, isDefault: r.isDefault, createdAt: r.createdAt.toISOString() };
}
async function resolveAccount(ctx: Ctx, accountId: number | null | undefined, category: string) {
  const db = ctx.db<typeof schema>();
  const all = await db.select().from(schema.accounts);
  if (accountId) { const a = all.find(x=>x.id===accountId); if (a) return a; }
  const byCat = all.find(x=>x.type===category);
  return byCat ?? all[0] ?? null;
}
type MsgRow = typeof schema.messages.$inferSelect;
type EvtRow = typeof schema.events.$inferSelect;
function toMsg(r: MsgRow): z.infer<typeof msgObj> {
  return { id: r.id, accountId: r.accountId ?? null, folder: r.folder, category: r.category, fromName: r.fromName, fromEmail: r.fromEmail, toRecipients: r.toRecipients, ccRecipients: r.ccRecipients, subject: r.subject, body: r.body, isRead: r.isRead, isStarred: r.isStarred, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() };
}
function toEvt(r: EvtRow): z.infer<typeof evtObj> {
  return { id: r.id, accountId: r.accountId ?? null, title: r.title, description: r.description, location: r.location, startAt: r.startAt.toISOString(), endAt: r.endAt.toISOString(), allDay: r.allDay, category: r.category, color: r.color, createdAt: r.createdAt.toISOString() };
}

async function ensureSeed(ctx: Ctx) {
  const db = ctx.db<typeof schema>();
  let accts = await db.select().from(schema.accounts);
  if (accts.length === 0) {
    await db.insert(schema.accounts).values([
      { displayName: "Work", email: "me.work@foxmail", type: "work" as const, organization: "", incomingProtocol: "none" as const, isDefault: true },
      { displayName: "Personal", email: "me.personal@foxmail", type: "personal" as const, organization: "", incomingProtocol: "none" as const, isDefault: false },
    ]);
    accts = await db.select().from(schema.accounts);
  }
  const existing = await db.select({ id: schema.messages.id }).from(schema.messages).limit(1);
  if (existing.length === 0) {
    const now = new Date();
    const work = accts.find(a=>a.type==="work"); const pers = accts.find(a=>a.type==="personal");
    await db.insert(schema.messages).values([
      { accountId: work?.id ?? null, folder: "inbox" as const, category: "work" as const, fromName: "FoxMail System", fromEmail: "system@foxmail", toRecipients: work?.email ?? "me.work@foxmail", subject: "Welcome to FoxMail \u2014 Work", body: "Welcome to FoxMail.\n\nYour Work account is ready. Each account in FoxMail has its own Inbox, Drafts, Sent, Archive, Junk and Trash. Use the account switcher to move between addresses, and Add Account to add another Work, Personal, or Professional address.\n\nProfessional accounts link to any organisation or company: add the organisation name together with IMAP (default) or POP3 settings for receiving and SMTP settings for sending.\n\nDrafts: compose, select Save Draft, edit it later from Drafts, then Send.\n\nKind regards,\nThe FoxMail Team", isRead: false, isStarred: false, createdAt: now, updatedAt: now },
      { accountId: pers?.id ?? null, folder: "inbox" as const, category: "personal" as const, fromName: "FoxMail System", fromEmail: "system@foxmail", toRecipients: pers?.email ?? "me.personal@foxmail", subject: "Welcome to FoxMail \u2014 Personal", body: "Welcome to your Personal mailbox.\n\nThis account is for personal correspondence, kept separate from Work and Professional accounts, with its own folders and drafts.\n\nUse All to see every account together, or switch to a single account to focus.\n\nKind regards,\nThe FoxMail Team", isRead: false, isStarred: false, createdAt: new Date(now.getTime() - 60000), updatedAt: new Date(now.getTime() - 60000) },
    ]);
  }
}

async function notify(ctx: Ctx, kind: "mail"|"calendar"|"system", title: string, body: string, accountId: number | null, relatedId: number | null) {
  try { const db = ctx.db<typeof schema>(); await db.insert(schema.notifications).values({ kind, title, body, accountId, relatedId }); } catch {}
}
const ASSISTANT_SYSTEM = "You are Foxmail, the AI assistant inside FoxMail. Your tone is always formal, professional and friendly: courteous, clear, well-structured, warm but businesslike. Address the user respectfully, avoid slang, contractions are acceptable sparingly, never be playful or overly casual. You help with email drafting, inbox summarisation, and calendar scheduling.";

export const Actions = {

  listAccounts: defineAction({
    description: "Lists all email accounts (Work, Personal, Professional) without exposing passwords.",
    request: z.object({}),
    response: z.object({ accounts: z.array(acctObj) }),
    async handler(ctx) { await ensureSeed(ctx); const db = ctx.db<typeof schema>(); const rows = await db.select().from(schema.accounts).orderBy(asc(schema.accounts.id)); const accounts = []; for (const r of rows) { let url: string | null = null; if (r.avatarBlobKey) { try { url = await ctx.blobs.getUrl(r.avatarBlobKey); } catch {} } accounts.push(toAcct(r, url)); } return { accounts }; },
  }),
  createAccount: defineAction({
    description: "Adds an email account. Professional accounts link an organisation inbox via IMAP (default) or POP3 for receiving and SMTP for sending.",
    request: z.object({ displayName: z.string().trim().min(1).max(120), email: z.string().trim().min(3).max(200), type: acctType.default("work"), organization: z.string().max(200).default(""), incomingProtocol: z.enum(["imap","pop3","none"]).default("imap"), incomingServer: z.string().max(200).default(""), incomingPort: z.number().int().min(1).max(65535).default(993), incomingUsername: z.string().max(200).default(""), incomingPassword: z.string().max(500).default(""), incomingUseTls: z.boolean().default(true), smtpServer: z.string().max(200).default(""), smtpPort: z.number().int().min(1).max(65535).default(587), smtpUsername: z.string().max(200).default(""), smtpPassword: z.string().max(500).default(""), smtpUseTls: z.boolean().default(true), signature: z.string().max(2000).default(""), autoReplyEnabled: z.boolean().default(false), autoReplySubject: z.string().max(200).default("Out of office"), autoReplyBody: z.string().max(3000).default("") }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      await ensureSeed(ctx); const db = ctx.db<typeof schema>();
      const proto = args.type === "professional" && args.incomingProtocol === "none" ? "imap" as const : args.incomingProtocol;
      const res = await db.insert(schema.accounts).values({ displayName: args.displayName, email: args.email, type: args.type, organization: args.organization, incomingProtocol: proto, incomingServer: args.incomingServer, incomingPort: args.incomingPort, incomingUsername: args.incomingUsername, incomingPassword: args.incomingPassword, incomingUseTls: args.incomingUseTls, smtpServer: args.smtpServer, smtpPort: args.smtpPort, smtpUsername: args.smtpUsername, smtpPassword: args.smtpPassword, smtpUseTls: args.smtpUseTls, signature: args.signature, autoReplyEnabled: args.autoReplyEnabled, autoReplySubject: args.autoReplySubject, autoReplyBody: args.autoReplyBody }).returning({ id: schema.accounts.id });
      ctx.invalidateQueries(); return { id: res[0]!.id };
    },
  }),
  updateAccount: defineAction({
    description: "Updates an email account and its IMAP/POP3/SMTP settings. Blank password fields keep the stored password.",
    request: z.object({ id: z.number(), displayName: z.string().trim().min(1).max(120), email: z.string().trim().min(3).max(200), type: acctType.default("work"), organization: z.string().max(200).default(""), incomingProtocol: z.enum(["imap","pop3","none"]).default("imap"), incomingServer: z.string().max(200).default(""), incomingPort: z.number().int().min(1).max(65535).default(993), incomingUsername: z.string().max(200).default(""), incomingPassword: z.string().max(500).default(""), incomingUseTls: z.boolean().default(true), smtpServer: z.string().max(200).default(""), smtpPort: z.number().int().min(1).max(65535).default(587), smtpUsername: z.string().max(200).default(""), smtpPassword: z.string().max(500).default(""), smtpUseTls: z.boolean().default(true), signature: z.string().max(2000).default(""), autoReplyEnabled: z.boolean().default(false), autoReplySubject: z.string().max(200).default("Out of office"), autoReplyBody: z.string().max(3000).default("") }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>(); const existing = (await db.select().from(schema.accounts).where(eq(schema.accounts.id, args.id)))[0];
      await db.update(schema.accounts).set({ displayName: args.displayName, email: args.email, type: args.type, organization: args.organization, incomingProtocol: args.incomingProtocol, incomingServer: args.incomingServer, incomingPort: args.incomingPort, incomingUsername: args.incomingUsername, incomingPassword: args.incomingPassword || (existing?.incomingPassword ?? ""), incomingUseTls: args.incomingUseTls, smtpServer: args.smtpServer, smtpPort: args.smtpPort, smtpUsername: args.smtpUsername, smtpPassword: args.smtpPassword || (existing?.smtpPassword ?? ""), smtpUseTls: args.smtpUseTls, signature: args.signature, autoReplyEnabled: args.autoReplyEnabled, autoReplySubject: args.autoReplySubject, autoReplyBody: args.autoReplyBody }).where(eq(schema.accounts.id, args.id));
      ctx.invalidateQueries(); return { ok: true as const };
    },
  }),
  deleteAccount: defineAction({
    description: "Deletes an email account. Its messages remain under their category view.",
    request: z.object({ id: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> { const db = ctx.db<typeof schema>(); await db.delete(schema.accounts).where(eq(schema.accounts.id, args.id)); ctx.invalidateQueries(); return { ok: true as const }; },
  }),
  getCounts: defineAction({
    description: "Returns folder and category counts for the mailbox.",
    request: z.object({}),
    response: z.object({
      total: z.number(), unreadInbox: z.number(),
      counts: z.array(z.object({ folder: z.string(), category: z.string(), accountId: z.number().nullable(), total: z.number(), unread: z.number() })),
      upcomingEvents: z.number(),
    }),
    async handler(ctx) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      const rows = await db.select().from(schema.messages);
      const map = new Map<string, { folder: string; category: string; accountId: number | null; total: number; unread: number }>();
      for (const r of rows) {
        const key = `${r.folder}|${r.category}|${r.accountId ?? 0}`;
        const cur = map.get(key) ?? { folder: r.folder, category: r.category, accountId: r.accountId ?? null, total: 0, unread: 0 };
        cur.total++; if (!r.isRead && r.folder === "inbox") cur.unread++;
        map.set(key, cur);
      }
      const evts = await db.select().from(schema.events);
      const upcoming = evts.filter(e => e.endAt >= new Date()).length;
      return { total: rows.length, unreadInbox: rows.filter(r => r.folder === "inbox" && !r.isRead).length, counts: [...map.values()], upcomingEvents: upcoming };
    },
  }),

  listMessages: defineAction({
    description: "Lists messages filtered by folder, Work/Personal category, and search.",
    request: z.object({ folder: folderEnum.default("inbox"), category: catFilter.default("all"), accountId: z.number().nullable().default(null), search: z.string().max(200).default(""), limit: z.number().int().positive().max(200).default(100) }),
    response: z.object({ messages: z.array(msgObj) }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      let rows: MsgRow[];
      if (args.folder === "starred") {
        rows = await db.select().from(schema.messages).orderBy(desc(schema.messages.createdAt)).limit(500);
        rows = rows.filter(r => r.isStarred && r.folder !== "trash");
      } else {
        rows = await db.select().from(schema.messages).where(eq(schema.messages.folder, args.folder)).orderBy(desc(schema.messages.createdAt)).limit(500);
      }
      if (args.category !== "all") rows = rows.filter(r => r.category === args.category);
      if (args.accountId) rows = rows.filter(r => r.accountId === args.accountId);
      if (args.search.trim()) {
        const q = args.search.trim().toLowerCase();
        rows = rows.filter(r => [r.subject, r.body, r.fromName, r.fromEmail, r.toRecipients].join(" ").toLowerCase().includes(q));
      }
      return { messages: rows.slice(0, args.limit).map(toMsg) };
    },
  }),

  saveDraft: defineAction({
    description: "Saves a message as a draft.",
    request: z.object({ id: z.number().nullable().default(null), accountId: z.number().nullable().default(null), toRecipients: z.string().max(500).default(""), ccRecipients: z.string().max(500).default(""), subject: z.string().max(300).default(""), body: z.string().max(20000).default(""), category: catEnum.default("work") }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const acct = await resolveAccount(ctx, args.accountId, args.category);
      const cat = (acct?.type ?? args.category) as "work"|"personal"|"professional";
      if (args.id) {
        await db.update(schema.messages).set({ accountId: acct?.id ?? null, toRecipients: args.toRecipients, ccRecipients: args.ccRecipients, subject: args.subject || "(No subject)", body: args.body, category: cat, folder: "drafts", updatedAt: new Date() }).where(eq(schema.messages.id, args.id));
        ctx.invalidateQueries(); return { id: args.id };
      }
      const res = await db.insert(schema.messages).values({ accountId: acct?.id ?? null, folder: "drafts", category: cat, fromName: acct?.displayName || "Me", fromEmail: acct?.email ?? "me@foxmail", toRecipients: args.toRecipients, ccRecipients: args.ccRecipients, subject: args.subject || "(No subject)", body: args.body, isRead: true }).returning({ id: schema.messages.id });
      ctx.invalidateQueries(); return { id: res[0]!.id };
    },
  }),

  sendEmail: defineAction({
    description: "Sends an email within FoxMail, filing it in Sent.",
    request: z.object({ id: z.number().nullable().default(null), accountId: z.number().nullable().default(null), toRecipients: z.string().trim().min(1).max(500), ccRecipients: z.string().max(500).default(""), subject: z.string().max(300).default(""), body: z.string().max(20000).default(""), category: catEnum.default("work") }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const acct = await resolveAccount(ctx, args.accountId, args.category);
      const cat = (acct?.type ?? args.category) as "work"|"personal"|"professional";
      const sigBody = acct?.signature && !args.body.includes(acct.signature) ? `${args.body}${args.body ? "\n\n" : ""}--\n${acct.signature}` : args.body;
      if (args.id) {
        await db.update(schema.messages).set({ accountId: acct?.id ?? null, fromName: acct?.displayName || "Me", fromEmail: acct?.email ?? "me@foxmail", toRecipients: args.toRecipients, ccRecipients: args.ccRecipients, subject: args.subject || "(No subject)", body: sigBody, category: cat, folder: "sent", isRead: true, updatedAt: new Date(), createdAt: new Date() }).where(eq(schema.messages.id, args.id));
        ctx.invalidateQueries(); return { id: args.id };
      }
      const res = await db.insert(schema.messages).values({ accountId: acct?.id ?? null, folder: "sent", category: cat, fromName: acct?.displayName || "Me", fromEmail: acct?.email ?? "me@foxmail", toRecipients: args.toRecipients, ccRecipients: args.ccRecipients, subject: args.subject || "(No subject)", body: sigBody, isRead: true }).returning({ id: schema.messages.id });
      ctx.invalidateQueries(); return { id: res[0]!.id };
    },
  }),

  createInboxMessage: defineAction({
    description: "Creates a received message in the inbox (for noting mail received elsewhere).",
    request: z.object({ accountId: z.number().nullable().default(null), fromName: z.string().trim().min(1).max(120), fromEmail: z.string().max(200).default(""), subject: z.string().max(300).default(""), body: z.string().max(20000).default(""), category: catEnum.default("work") }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const acct2 = await resolveAccount(ctx, args.accountId, args.category); const res = await db.insert(schema.messages).values({ accountId: acct2?.id ?? null, folder: "inbox", category: (acct2?.type ?? args.category) as "work"|"personal"|"professional", fromName: args.fromName, fromEmail: args.fromEmail, toRecipients: acct2?.email ?? "me@foxmail", subject: args.subject || "(No subject)", body: args.body, isRead: false }).returning({ id: schema.messages.id });
      await notify(ctx, "mail", `New mail from ${args.fromName}`, args.subject || "(No subject)", acct2?.id ?? null, res[0]!.id);
      if (acct2?.autoReplyEnabled) {
        const arBody = acct2.autoReplyBody || "Thank you for your message. I am currently out of office and will respond on my return.";
        await db.insert(schema.messages).values({ accountId: acct2.id, folder: "sent", category: acct2.type, fromName: acct2.displayName || "Me", fromEmail: acct2.email, toRecipients: args.fromEmail || args.fromName, subject: `Automatic reply: ${acct2.autoReplySubject}`, body: `${arBody}${acct2.signature ? "\n\n--\n" + acct2.signature : ""}`, isRead: true });
        await notify(ctx, "system", `Out-of-office reply sent for ${acct2.email}`, acct2.autoReplySubject, acct2.id, res[0]!.id);
      }
      ctx.invalidateQueries(); return { id: res[0]!.id };
    },
  }),

  updateMessage: defineAction({
    description: "Updates a message: read, starred, folder, or category.",
    request: z.object({ id: z.number(), accountId: z.number().nullable().default(null), isRead: z.boolean().nullable().default(null), isStarred: z.boolean().nullable().default(null), folder: folderEnum.nullable().default(null), category: catEnum.nullable().default(null) }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      const patch: Partial<MsgRow> = { updatedAt: new Date() };
      if (args.isRead !== null) patch.isRead = args.isRead;
      if (args.isStarred !== null) patch.isStarred = args.isStarred;
      if (args.folder !== null && args.folder !== "starred") patch.folder = args.folder;
      if (args.category !== null) patch.category = args.category;
      if (args.accountId !== null) patch.accountId = args.accountId;
      await db.update(schema.messages).set(patch).where(eq(schema.messages.id, args.id));
      ctx.invalidateQueries(); return { ok: true as const };
    },
  }),

  deleteMessage: defineAction({
    description: "Permanently deletes a message.",
    request: z.object({ id: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.messages).where(eq(schema.messages.id, args.id));
      ctx.invalidateQueries(); return { ok: true as const };
    },
  }),

  listEvents: defineAction({
    description: "Lists calendar events, optionally filtered by Work/Personal category.",
    request: z.object({ category: catFilter.default("all"), accountId: z.number().nullable().default(null) }),
    response: z.object({ events: z.array(evtObj) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      let rows = await db.select().from(schema.events).orderBy(asc(schema.events.startAt));
      if (args.category !== "all") rows = rows.filter(r => r.category === args.category);
      if (args.accountId) rows = rows.filter(r => r.accountId === args.accountId);
      return { events: rows.map(toEvt) };
    },
  }),

  createEvent: defineAction({
    description: "Creates a calendar event.",
    request: z.object({ accountId: z.number().nullable().default(null), title: z.string().trim().min(1).max(200), description: z.string().max(5000).default(""), location: z.string().max(300).default(""), startAt: z.string(), endAt: z.string(), allDay: z.boolean().default(false), category: catEnum.default("work"), color: z.string().max(20).default("#EA580C") }),
    response: z.object({ id: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const acctE = await resolveAccount(ctx, args.accountId, args.category); const res = await db.insert(schema.events).values({ accountId: acctE?.id ?? null, title: args.title, description: args.description, location: args.location, startAt: new Date(args.startAt), endAt: new Date(args.endAt), allDay: args.allDay, category: args.category, color: args.color }).returning({ id: schema.events.id });
      await notify(ctx, "calendar", `Calendar event: ${args.title}`, new Date(args.startAt).toLocaleString(), acctE?.id ?? null, res[0]!.id);
      ctx.invalidateQueries(); return { id: res[0]!.id };
    },
  }),

  updateEvent: defineAction({
    description: "Updates a calendar event.",
    request: z.object({ id: z.number(), accountId: z.number().nullable().default(null), title: z.string().trim().min(1).max(200), description: z.string().max(5000).default(""), location: z.string().max(300).default(""), startAt: z.string(), endAt: z.string(), allDay: z.boolean().default(false), category: catEnum.default("work"), color: z.string().max(20).default("#EA580C") }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.update(schema.events).set({ accountId: args.accountId ?? undefined, title: args.title, description: args.description, location: args.location, startAt: new Date(args.startAt), endAt: new Date(args.endAt), allDay: args.allDay, category: args.category, color: args.color }).where(eq(schema.events.id, args.id));
      ctx.invalidateQueries(); return { ok: true as const };
    },
  }),

  deleteEvent: defineAction({
    description: "Deletes a calendar event.",
    request: z.object({ id: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> {
      const db = ctx.db<typeof schema>();
      await db.delete(schema.events).where(eq(schema.events.id, args.id));
      ctx.invalidateQueries(); return { ok: true as const };
    },
  }),



  uploadAvatar: defineAction({
    description: "Uploads a profile picture for an email account, stored as the account avatar.",
    request: z.object({ accountId: z.number(), dataBase64: z.string().min(1).max(8000000), mimeType: z.string().max(60) }),
    response: z.object({ ok: z.literal(true), avatarUrl: z.string().nullable() }),
    async handler(ctx, args): Promise<{ ok: true; avatarUrl: string | null }> {
      if (!["image/png","image/jpeg","image/webp","image/gif"].includes(args.mimeType)) throw new Error("Please choose a PNG, JPEG, WebP, or GIF image.");
      const db = ctx.db<typeof schema>();
      const key = `avatar-${args.accountId}-${Date.now()}`;
      const bytes = Uint8Array.from(atob(args.dataBase64), c => c.charCodeAt(0));
      await ctx.blobs.put(key, bytes, { contentType: args.mimeType });
      await db.update(schema.accounts).set({ avatarBlobKey: key }).where(eq(schema.accounts.id, args.accountId));
      let url: string | null = null; try { url = await ctx.blobs.getUrl(key); } catch {}
      ctx.invalidateQueries(); return { ok: true as const, avatarUrl: url };
    },
  }),
  removeAvatar: defineAction({
    description: "Removes the profile picture for an email account.",
    request: z.object({ accountId: z.number() }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> { const db = ctx.db<typeof schema>(); await db.update(schema.accounts).set({ avatarBlobKey: "" }).where(eq(schema.accounts.id, args.accountId)); ctx.invalidateQueries(); return { ok: true as const }; },
  }),
  listNotifications: defineAction({
    description: "Lists notifications for new mail, calendar events, and system messages such as auto-replies.",
    request: z.object({ limit: z.number().int().positive().max(100).default(50) }),
    response: z.object({ notifications: z.array(z.object({ id: z.number(), kind: z.string(), title: z.string(), body: z.string(), accountId: z.number().nullable(), isRead: z.boolean(), createdAt: z.string() })), unread: z.number() }),
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); const rows = await db.select().from(schema.notifications).orderBy(desc(schema.notifications.id)).limit(args.limit); return { notifications: rows.map(r=>({ id: r.id, kind: r.kind, title: r.title, body: r.body, accountId: r.accountId ?? null, isRead: r.isRead, createdAt: r.createdAt.toISOString() })), unread: rows.filter(r=>!r.isRead).length }; },
  }),
  markNotificationsRead: defineAction({
    description: "Marks one or all notifications as read.",
    request: z.object({ id: z.number().nullable().default(null) }),
    response: z.object({ ok: z.literal(true) }),
    async handler(ctx, args): Promise<{ ok: true }> { const db = ctx.db<typeof schema>(); if (args.id) await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, args.id)); else { const rows = await db.select().from(schema.notifications); for (const r of rows) if (!r.isRead) await db.update(schema.notifications).set({ isRead: true }).where(eq(schema.notifications.id, r.id)); } ctx.invalidateQueries(); return { ok: true as const }; },
  }),
  summarizeInbox: defineAction({
    description: "Foxmail assistant summarises the inbox in a formal, professional and friendly tone.",
    request: z.object({ category: catFilter.default("all") }),
    response: z.object({ summary: z.string(), bullets: z.array(z.string()), urgent: z.array(z.string()) }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      let rows = await db.select().from(schema.messages).where(eq(schema.messages.folder, "inbox")).orderBy(desc(schema.messages.createdAt)).limit(30);
      if (args.category !== "all") rows = rows.filter(r => r.category === args.category);
      const evts = await db.select().from(schema.events).orderBy(asc(schema.events.startAt));
      const upcoming = evts.filter(e => e.endAt >= new Date()).slice(0, 8);
      if (rows.length === 0) return { summary: "Good day. Your inbox is currently clear in this view, and there are no messages requiring your attention at this time.", bullets: ["No messages in this view."], urgent: [] };
      const inboxText = rows.map(r => `[${r.category.toUpperCase()}${r.isRead ? "" : " • UNREAD"}] From: ${r.fromName} — Subject: ${r.subject} — ${r.body.slice(0, 400)}`).join("\n\n");
      const calText = upcoming.map(e => `${e.title} (${e.category}) at ${e.startAt.toISOString()} ${e.location ? "at " + e.location : ""}`).join("\n") || "No upcoming events.";
      const outSchema = z.object({ summary: z.string(), bullets: z.array(z.string()), urgent: z.array(z.string()) });
      const result = await ctx.inference.complete(`Please summarise this inbox and calendar for the user.\n\nINBOX:\n${inboxText}\n\nUPCOMING CALENDAR:\n${calText}\n\nProvide a concise formal summary paragraph, 3-6 key bullets, and a list of urgent items (empty if none).`, { system: ASSISTANT_SYSTEM, schema: outSchema });
      return result;
    },
  }),

  draftEmailAI: defineAction({
    description: "Foxmail assistant drafts an email in a formal, professional and friendly tone.",
    request: z.object({ prompt: z.string().trim().min(1).max(2000), category: catEnum.default("work"), recipient: z.string().max(200).default(""), language: z.string().max(60).default("English") }),
    response: z.object({ subject: z.string(), body: z.string() }),
    async handler(ctx, args) {
      const outSchema = z.object({ subject: z.string(), body: z.string() });
      const result = await ctx.inference.complete(`Draft a complete email based on this request: "${args.prompt}"\nCategory: ${args.category}. ${args.recipient ? "Recipient: " + args.recipient : ""}\nWrite the entire email (subject and body) in this language: ${args.language} (if the language is English, write in English). Write a clear subject line and a complete, ready-to-send body with a formal greeting, well-structured paragraphs, and a courteous closing (e.g. Kind regards). Do not include placeholders like [Name] — sign off as the sender generically if no name is given.`, { system: ASSISTANT_SYSTEM, schema: outSchema });
      return result;
    },
  }),

  assistantChat: defineAction({
    description: "Chat with Foxmail, the formal, professional and friendly AI assistant, for drafting, summarising, and scheduling help.",
    request: z.object({ message: z.string().trim().min(1).max(3000), category: catFilter.default("all"), history: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string().max(3000) })).max(12).default([]) }),
    response: z.object({ reply: z.string(), draftSubject: z.string().nullable(), draftBody: z.string().nullable(), draftCategory: z.string().nullable(), eventTitle: z.string().nullable(), eventLocation: z.string().nullable(), eventDescription: z.string().nullable() }),
    async handler(ctx, args) {
      await ensureSeed(ctx);
      const db = ctx.db<typeof schema>();
      let rows = await db.select().from(schema.messages).where(eq(schema.messages.folder, "inbox")).orderBy(desc(schema.messages.createdAt)).limit(15);
      if (args.category !== "all") rows = rows.filter(r => r.category === args.category);
      const evts = await db.select().from(schema.events).orderBy(asc(schema.events.startAt));
      const upcoming = evts.filter(e => e.endAt >= new Date()).slice(0, 10);
      const context = `Current date/time: ${new Date().toISOString()}\nInbox (recent): ${rows.map(r => `${r.fromName}: ${r.subject} [${r.category}${r.isRead ? "" : ", unread"}]`).join("; ") || "empty"}\nUpcoming events: ${upcoming.map(e => `${e.title} on ${e.startAt.toISOString()} [${e.category}]`).join("; ") || "none"}\nView filter: ${args.category}`;
      const historyText = args.history.map(h => `${h.role === "user" ? "User" : "Foxmail"}: ${h.content}`).join("\n");
      const outSchema = z.object({ reply: z.string(), draftSubject: z.string().nullable(), draftBody: z.string().nullable(), draftCategory: z.string().nullable(), eventTitle: z.string().nullable(), eventLocation: z.string().nullable(), eventDescription: z.string().nullable() });
      const result = await ctx.inference.complete(`${context}\n\nConversation so far:\n${historyText}\n\nUser: ${args.message}\n\nRespond helpfully and formally. If the user asks you to draft an email, fill draftSubject/draftBody/draftCategory (work, personal, or professional) with a complete ready-to-send draft and keep reply brief and courteous. If the user asks to schedule/create an event or meeting, fill eventTitle/eventLocation/eventDescription and keep reply confirming what you propose — the user will confirm the date/time in the editor. Otherwise leave draft and event fields null.`, { system: ASSISTANT_SYSTEM, schema: outSchema });
      return result;
    },
  }),
} satisfies ActionsModule;
