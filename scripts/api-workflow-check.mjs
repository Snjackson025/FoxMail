// FoxMail API workflow check — no dependencies, runs with plain Node.
// Run locally:  node scripts/api-workflow-check.mjs
//            or bun run api:check
// Run in CI:   .github/workflows/api.yml (job: api-contract)
//
// Checks the API contract that the client and server must agree on:
//  - every expected action exists in server/src/actions.ts
//  - listAccounts never exposes a stored password (only has*Password flags)
//  - the database tables the actions use exist in server/src/schema.ts
//  - the typed client in client/src/api.ts calls the server actions
//  - drizzle migrations and package scripts are present
//  - the GitHub Actions workflow file exists and has both jobs
//
// This is a static contract check. It does not need the Hatch runtime,
// a database, or network access, so it can run on a public GitHub runner.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const passes = [];

function check(name, ok, detail = "") {
  if (ok) passes.push(name);
  else failures.push(detail ? `${name} — ${detail}` : name);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const actionsSrc = read("server/src/actions.ts");
const schemaSrc = read("server/src/schema.ts");
const apiClientSrc = read("client/src/api.ts");
const pkg = JSON.parse(read("package.json"));

// 1. Expected actions — keep in sync with server/src/actions.ts
const expectedActions = [
  "listAccounts",
  "createAccount",
  "updateAccount",
  "deleteAccount",
  "getCounts",
  "listMessages",
  "saveDraft",
  "sendEmail",
  "createInboxMessage",
  "updateMessage",
  "deleteMessage",
  "listEvents",
  "createEvent",
  "updateEvent",
  "deleteEvent",
  "uploadAvatar",
  "removeAvatar",
  "listNotifications",
  "markNotificationsRead",
  "summarizeInbox",
  "draftEmailAI",
  "assistantChat",
];

for (const name of expectedActions) {
  check(
    `action ${name} exists`,
    new RegExp(`^\\s{2}${name}: defineAction\\(`, "m").test(actionsSrc),
    `not found in server/src/actions.ts`,
  );
}

// 2. listAccounts must not expose stored passwords.
// acctObj is the shape listAccounts returns; it must use has*Password
// booleans, never the password strings themselves.
const acctObjMatch = actionsSrc.match(/const acctObj = z\.object\(\{([\s\S]*?)\}\);/);
check("acctObj block found", Boolean(acctObjMatch));
if (acctObjMatch) {
  const acctObj = acctObjMatch[1];
  check(
    "listAccounts exposes hasIncomingPassword, not incomingPassword",
    acctObj.includes("hasIncomingPassword") && !acctObj.includes("incomingPassword:"),
  );
  check(
    "listAccounts exposes hasSmtpPassword, not smtpPassword",
    acctObj.includes("hasSmtpPassword") && !acctObj.includes("smtpPassword:"),
  );
}

// 3. Database tables the actions use
for (const table of ["accounts", "messages", "events", "notifications"]) {
  check(
    `schema table ${table} exists`,
    schemaSrc.includes(`export const ${table} = sqliteTable("${table}"`),
    `not found in server/src/schema.ts`,
  );
}

// 4. Typed client calls the server actions
check(
  "client uses createActionClient",
  apiClientSrc.includes("createActionClient"),
  "client/src/api.ts does not use createActionClient",
);
check(
  "client imports Actions type from server",
  apiClientSrc.includes('from "../../server/src/actions"'),
  "client/src/api.ts does not import the Actions type",
);

// 5. Drizzle migrations 0001-0005 are present
const drizzleFiles = readdirSync(join(root, "drizzle"));
for (let i = 1; i <= 5; i++) {
  const n = String(i).padStart(4, "0");
  check(
    `drizzle migration ${n} exists`,
    drizzleFiles.some((f) => f.startsWith(n)),
    `no drizzle/${n}_*.sql`,
  );
}

// 6. Package scripts
for (const script of ["typecheck", "build", "api:check"]) {
  check(
    `package.json script ${script} exists`,
    Boolean(pkg.scripts?.[script]),
    `missing scripts.${script}`,
  );
}

// 7. GitHub Actions workflow
const workflow = existsSync(join(root, ".github/workflows/api.yml"))
  ? read(".github/workflows/api.yml")
  : "";
check("workflow .github/workflows/api.yml exists", workflow.length > 0);
if (workflow) {
  check("workflow has api-contract job", workflow.includes("api-contract:"));
  check("workflow has build job", workflow.includes("  build:"));
  check(
    "workflow runs the API check",
    workflow.includes("node scripts/api-workflow-check.mjs"),
  );
}

for (const p of passes) console.log(`PASS ${p}`);
if (failures.length) {
  for (const f of failures) console.error(`FAIL ${f}`);
  console.error(`\n${failures.length} check(s) failed, ${passes.length} passed.`);
  process.exit(1);
}
console.log(`\nAll ${passes.length} FoxMail API checks passed.`);
