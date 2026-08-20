/**
 * Creates or resets Firebase Auth admin users.
 * Password must be >=6 chars (Firebase rule) — using admin1.
 *
 * Usage: node --env-file=.env.local scripts/ensure-admin-user.mjs
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const ADMINS = [
  { email: "henk.seegers1965@gmail.com", displayName: "Hendrik Seegers" },
  {
    email: "hendrik.seegers1991@icloud.com",
    displayName: "Hendrik Seegers",
  },
];
/** Firebase Auth requires min 6 characters; plan requested "admin". */
const PASSWORD = "admin1";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin env vars.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const auth = getAuth();
const db = getFirestore();

async function ensureAdmin({ email, displayName }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password: PASSWORD });
    console.log(`Updated password for ${email}`);
  } catch (e) {
    if (e?.code === "auth/user-not-found") {
      user = await auth.createUser({
        email,
        password: PASSWORD,
        emailVerified: true,
        displayName,
      });
      console.log(`Created user ${email}`);
    } else {
      throw e;
    }
  }

  await db.collection("members").doc(user.uid).set(
    {
      uid: user.uid,
      email,
      displayName,
      isAdmin: true,
      subscriptionStatus: "active",
    },
    { merge: true },
  );

  console.log(`Admin ready: ${email} / ${PASSWORD}`);
  console.log(`members/${user.uid}.isAdmin = true`);
}

async function main() {
  for (const admin of ADMINS) {
    await ensureAdmin(admin);
  }

  await db.doc("system/billing").set(
    {
      overBudget: false,
      limitEur: 100,
      spentEur: 0,
      percentUsed: 0,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  console.log("system/billing initialized (overBudget: false)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
