/**
 * Creates Happy People Stripe product + monthly/yearly prices,
 * enables the Customer Portal, and prints env values to paste.
 *
 * Usage: node --env-file=.env.local scripts/setup-stripe.mjs
 * Requires STRIPE_SECRET_KEY (test mode recommended).
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Stripe = require("stripe");

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Set STRIPE_SECRET_KEY first (test key recommended).");
  process.exit(1);
}

const stripe = new Stripe(key);

async function findOrCreateProduct() {
  const existing = await stripe.products.search({
    query: "name:'Happy People Membership' AND active:'true'",
    limit: 1,
  });
  if (existing.data[0]) return existing.data[0];
  return stripe.products.create({
    name: "Happy People Membership",
    description:
      "Club access: seminar recordings, vlogs, quotes, and messages from Henk. 1 week free trial.",
    metadata: { app: "happy-people" },
  });
}

async function findOrCreatePrice(productId, { nickname, unitAmount, interval }) {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  const match = prices.data.find(
    (p) =>
      p.recurring?.interval === interval &&
      p.unit_amount === unitAmount &&
      p.currency === "eur",
  );
  if (match) return match;
  return stripe.prices.create({
    product: productId,
    currency: "eur",
    unit_amount: unitAmount,
    recurring: { interval },
    nickname,
    metadata: { app: "happy-people", plan: interval === "year" ? "yearly" : "monthly" },
  });
}

async function ensurePortal(productId, monthlyPriceId, yearlyPriceId) {
  const list = await stripe.billingPortal.configurations.list({ limit: 10 });
  const active = list.data.find((c) => c.active);
  if (active) {
    console.log("portal config already exists:", active.id);
    return active;
  }
  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: "Happy People — beheer je lidmaatschap",
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ["email", "address"],
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: "at_period_end",
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: [
          {
            product: productId,
            prices: [monthlyPriceId, yearlyPriceId],
          },
        ],
      },
    },
  });
  console.log("created portal config:", config.id);
  return config;
}

const product = await findOrCreateProduct();
const monthly = await findOrCreatePrice(product.id, {
  nickname: "Happy People monthly",
  unitAmount: 2000,
  interval: "month",
});
const yearly = await findOrCreatePrice(product.id, {
  nickname: "Happy People yearly",
  unitAmount: 20000,
  interval: "year",
});
await ensurePortal(product.id, monthly.id, yearly.id);

console.log("\nAdd these to .env.local:\n");
console.log(`STRIPE_PRICE_ID_MONTHLY=${monthly.id}`);
console.log(`STRIPE_PRICE_ID_YEARLY=${yearly.id}`);
console.log(`STRIPE_PRICE_ID=${monthly.id}`);
console.log("\nProduct:", product.id);
console.log("Done.");
