/**
 * Seeds Firestore with blog posts, events, videos, and quotes from site seed data.
 * Usage: node --env-file=.env.local scripts/seed-content.mjs
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

async function seedCollection(name, items, mapDoc) {
  const existing = await db.collection(name).limit(1).get();
  if (!existing.empty) {
    console.log(`skip ${name} (already has documents)`);
    return;
  }
  const batch = db.batch();
  for (const item of items) {
    const { id, data } = mapDoc(item);
    batch.set(db.collection(name).doc(id), data);
  }
  await batch.commit();
  console.log(`seeded ${name}: ${items.length}`);
}

await seedCollection("posts", seed.posts, (p) => ({
  id: p.id,
  data: {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body,
    publishedAt: p.publishedAt,
    membersOnly: Boolean(p.membersOnly),
  },
}));

await seedCollection("events", seed.events, (e) => ({
  id: e.id,
  data: {
    title: e.title,
    description: e.description,
    date: e.date,
    ...(e.dateUncertain ? { dateUncertain: true } : {}),
    time: e.time,
    location: e.location,
    ...(e.address ? { address: e.address } : {}),
    ...(e.priceLabel ? { priceLabel: e.priceLabel } : {}),
  },
}));

await seedCollection("videos", seed.videos, (v) => ({
  id: v.id,
  data: {
    title: v.title,
    description: v.description,
    kind: v.kind,
    publishedAt: v.publishedAt,
    ...(v.videoUrl ? { videoUrl: v.videoUrl } : {}),
    ...(v.durationLabel ? { durationLabel: v.durationLabel } : {}),
  },
}));

await seedCollection("quotes", seed.quotes, (q) => ({
  id: q.id,
  data: {
    text: q.text,
    publishedAt: q.publishedAt,
  },
}));

console.log("Done.");
