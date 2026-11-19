# FoxMail

FoxMail is a full email and calendar system, like Outlook — not a demo.

It has Work, Personal, and Professional inboxes, with multiple email
accounts you can switch between. Each account has an Inbox, Starred, Sent,
Drafts, Archive, Junk, and Trash, plus a calendar with month view, day
agenda, and upcoming events.

## What it includes

- **Work, Personal, and Professional accounts** — link a Professional inbox
  to any organization or company.
- **Mail** — compose, save drafts, reply, forward, star, archive, and delete.
  Search across messages.
- **Calendar** — create, edit, and delete events, per account type.
- **Foxmail AI assistant** — inside the app, formal, professional, and
  friendly. It can summarize your inbox, help draft emails, and help
  schedule calendar events.
- **Accounts** — IMAP is the default for receiving mail (port 993), POP3 is
  also supported, plus SMTP for sending (port 587), with TLS. Server
  settings are stored per account.
- **Signatures, auto-reply, and notifications** — a signature per account,
  out-of-office auto-reply, and notifications for new mail and calendar
  events.
- **Languages** — interface language selector with 32 languages, AI email
  drafting in 97 languages, and full Unicode support.
- **Profile pictures** — a picture as the face of your inbox, per account,
  shown in the header, sidebar, and next to sent mail.

## How it's built

This repository is the source for the FoxMail web app built with Muse:

- React client in `client/` (`client/src/App.tsx`)
- Server actions in `server/src/actions.ts`, schema in `server/src/schema.ts`
- Drizzle SQL migrations in `drizzle/`
- `foxmail.cpp` is the original C++ starting point, with StandardMath and
  FoxMath dual arithmetic

It runs on the Muse TypeScript space runtime (`space.json`, Bun). The
`@hatch/space-sdk` dependency is provided by that runtime.

```sh
bun install
bun run typecheck
bun run build
```

## Status

Mail and calendar data are stored locally in the app's database. Sending
stays within the FoxMail mailbox. IMAP / POP3 / SMTP settings are stored per
account, but this code does not by itself open a live connection to an
external Gmail or Outlook account — connecting a real address is a next step.
