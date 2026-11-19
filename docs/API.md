# FoxMail API

FoxMail is a full email and calendar system — Work, Personal, and
Professional accounts, with drafts, folders, signatures, auto-reply,
notifications, profile pictures, and the Foxmail AI assistant
(formal, professional, and friendly).

## How the API works

There is no separate public REST server. The API is the typed
action layer in `server/src/actions.ts`:

- **Server:** `server/src/actions.ts` — each action is defined with
  `defineAction({ description, request, response, handler })` from
  `@hatch/space-sdk`. Requests and responses are validated with Zod.
- **Client:** `client/src/api.ts` — `createActionClient<typeof Actions>()`
  returns a typed proxy. Calling `api.listMessages({ folder: "inbox" })`
  POSTs `{ action: "listMessages", args: { folder: "inbox" } }` to
  `./actions` and returns the typed response. No codegen is needed;
  the types come straight from the server file.
- **Database:** `server/src/schema.ts` (Drizzle / SQLite) — tables
  `accounts`, `messages`, `events`, `notifications`. Migrations live
  in `drizzle/0001_*.sql` through `drizzle/0005_*.sql`.
- **Mail transport:** accounts store IMAP (default, port 993) or
  POP3 settings for receiving and SMTP (port 587) for sending, with
  TLS. Sending inside FoxMail files mail in Sent; the stored
  IMAP/POP3/SMTP settings are not yet used to open a live connection
  to an external provider.

## Actions

### Accounts

| Action | Request | Response | Notes |
|---|---|---|---|
| `listAccounts` | `{}` | `{ accounts: Account[] }` | Never exposes passwords — only `hasIncomingPassword` / `hasSmtpPassword` booleans. |
| `createAccount` | displayName, email, type (`work` / `personal` / `professional`), organization, incomingProtocol (`imap` / `pop3` / `none`, default `imap`), incomingServer, incomingPort (default 993), incomingUsername, incomingPassword, incomingUseTls, smtpServer, smtpPort (default 587), smtpUsername, smtpPassword, smtpUseTls, signature, autoReplyEnabled, autoReplySubject, autoReplyBody | `{ id }` | Professional accounts link an organisation inbox. |
| `updateAccount` | `id` plus the same fields as `createAccount` | `{ ok: true }` | Blank password fields keep the stored password. |
| `deleteAccount` | `{ id }` | `{ ok: true }` | Its messages remain under their category view. |

### Mail

| Action | Request | Response |
|---|---|---|
| `getCounts` | `{}` | `{ total, unreadInbox, counts: [{ folder, category, accountId, total, unread }], upcomingEvents }` |
| `listMessages` | folder (`inbox` / `sent` / `drafts` / `archive` / `junk` / `trash` / `starred`), category (`all` / `work` / `personal` / `professional`), accountId, search, limit (max 200) | `{ messages: Message[] }` |
| `saveDraft` | `id?`, accountId, toRecipients, ccRecipients, subject, body, category | `{ id }` |
| `sendEmail` | `id?`, accountId, toRecipients, ccRecipients, subject, body, category | `{ id }` — files the mail in Sent and appends the account signature if set. |
| `createInboxMessage` | accountId, fromName, fromEmail, subject, body, category | `{ id }` — creates a received message, adds a notification, and sends the out-of-office auto-reply if enabled. |
| `updateMessage` | `id`, accountId?, isRead?, isStarred?, folder?, category? | `{ ok: true }` |
| `deleteMessage` | `{ id }` | `{ ok: true }` |

### Calendar

| Action | Request | Response |
|---|---|---|
| `listEvents` | category, accountId? | `{ events: Event[] }` |
| `createEvent` | accountId, title, description, location, startAt, endAt, allDay, category, color | `{ id }` — adds a calendar notification. |
| `updateEvent` | `id` plus the same fields as `createEvent` | `{ ok: true }` |
| `deleteEvent` | `{ id }` | `{ ok: true }` |

### Profile pictures and notifications

| Action | Request | Response |
|---|---|---|
| `uploadAvatar` | accountId, dataBase64, mimeType (`image/png`, `image/jpeg`, `image/webp`, `image/gif`) | `{ ok: true, avatarUrl }` |
| `removeAvatar` | `{ accountId }` | `{ ok: true }` |
| `listNotifications` | limit (max 100) | `{ notifications, unread }` |
| `markNotificationsRead` | `id?` (null = all) | `{ ok: true }` |

### Foxmail AI assistant

All three use the formal, professional, and friendly Foxmail tone.

| Action | Request | Response |
|---|---|---|
| `summarizeInbox` | category | `{ summary, bullets, urgent }` |
| `draftEmailAI` | prompt, category, recipient, language (default `English`) | `{ subject, body }` |
| `assistantChat` | message, category, history (up to 12 turns) | `{ reply, draftSubject?, draftBody?, draftCategory?, eventTitle?, eventLocation?, eventDescription? }` — fills the draft/event fields when the user asks to draft or schedule, otherwise leaves them null. |

## API workflow (GitHub Actions)

File: `.github/workflows/api.yml`

It runs on pushes and pull requests to `main` that touch the server,
the typed client, the database, `package.json`, or the workflow itself.

| Job | What it does | Needs |
|---|---|---|
| `api-contract` | Runs `node scripts/api-workflow-check.mjs` — checks all 22 actions exist, `listAccounts` never exposes a password, the `accounts` / `messages` / `events` / `notifications` tables exist, the client uses `createActionClient`, migrations 0001–0005 exist, and the workflow file has both jobs. | Node 20 only — no install, no database, no network. |
| `build` | `bun install`, `bun run typecheck`, `bun run build`. | Bun 1.3.10 and the Hatch SDK. |

### Known limitation

`package.json` depends on `@hatch/space-sdk` via a local file path
(`file:/opt/hatch/skills/spaces/ts-runtime/dist/space-sdk.tgz`). That
file is not in this repo and is not on a public GitHub runner, so the
`build` job cannot succeed on GitHub yet. It is marked
`continue-on-error: true` so it reports its status without blocking
the `api-contract` job. Once the SDK is published to a registry or
vendored into the repo, remove `continue-on-error` from the build job.

## Running the checks locally

```sh
bun run api:check   # same check CI runs: node scripts/api-workflow-check.mjs
bun run typecheck   # tsc --noEmit for client and server
bun run build       # build server, then build client
```

## Adding a new action

1. Add it in `server/src/actions.ts` with a Zod `request` and `response`.
2. Add it to the `expectedActions` list in
   `scripts/api-workflow-check.mjs`.
3. Document it in the tables above in this file.
4. The client picks it up automatically through the `Actions` type —
   no codegen step is needed.
