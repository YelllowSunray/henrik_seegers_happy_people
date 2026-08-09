/**
 * Toggle Firestore system/billing.overBudget (Samir override).
 *
 * Usage:
 *   node --env-file=.env.local scripts/set-billing-flag.mjs true
 *   node --env-file=.env.local scripts/set-billing-flag.mjs false
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const flag = process.argv[2];
if (flag !== "true" && flag !== "false") {
  console.error("Usage: node scripts/set-billing-flag.mjs true|false");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin env vars.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

const overBudget = flag === "true";
await getFirestore()
  .doc("system/billing")
  .set(
    {
      overBudget,
      limitEur: 100,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

console.log(`system/billing.overBudget = ${overBudget}`);
