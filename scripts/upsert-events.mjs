/**
 * Upserts seminar events in Firestore from seed-content.json.
 * Usage: node --env-file=.env.local scripts/upsert-events.mjs
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const __dirname = dirname(fileURLToPath(import.meta.url));
const seed = JSON.parse(
  readFileSync(join(__dirname, "seed-content.json"), "utf8"),
);

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

const db = getFirestore();

for (const event of seed.events) {
  await db
    .collection("events")
    .doc(event.id)
    .set(
      {
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        ...(event.address ? { address: event.address } : {}),
        ...(event.priceLabel ? { priceLabel: event.priceLabel } : {}),
      },
      { merge: true },
    );
  console.log(`upserted events/${event.id}`);
}
