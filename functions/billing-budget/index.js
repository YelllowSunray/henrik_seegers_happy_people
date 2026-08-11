/**
 * Google Cloud Function (2nd gen) — Pub/Sub trigger from a GCP Billing Budget.
 * Writes latest spend into Firestore and sets overBudget at 100%.
 *
 * Deploy (example):
 *   gcloud functions deploy firebaseBudgetHardStop \
 *     --gen2 --runtime=nodejs20 --region=europe-west1 \
 *     --trigger-topic=firebase-budget-alerts \
 *     --set-env-vars=GCP_PROJECT=hendrik-seegers-spiritual-club
 *
 * Service account needs Cloud Datastore User / Firestore write on the project.
 */
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp({
  credential: applicationDefault(),
  projectId: process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT,
});

const LIMIT_EUR = 100;

exports.firebaseBudgetHardStop = async (message) => {
  const data = message?.data
    ? JSON.parse(Buffer.from(message.data, "base64").toString())
    : {};

  const costAmount =
    data.costAmount != null && Number.isFinite(Number(data.costAmount))
      ? Number(data.costAmount)
      : null;
  const budgetAmount =
    data.budgetAmount != null && Number.isFinite(Number(data.budgetAmount))
      ? Number(data.budgetAmount)
      : LIMIT_EUR;

  const ratio =
    costAmount != null && budgetAmount > 0 ? costAmount / budgetAmount : null;
  const percentUsed =
    ratio != null ? Math.round(ratio * 1000) / 10 : null;
  const overBudget = ratio == null ? true : ratio >= 1;

  await getFirestore()
    .doc("system/billing")
    .set(
      {
        overBudget,
        limitEur: budgetAmount || LIMIT_EUR,
        ...(costAmount != null ? { spentEur: costAmount } : {}),
        ...(percentUsed != null ? { percentUsed } : {}),
        updatedAt: new Date().toISOString(),
        lastAlert: data,
        triggeredAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  console.log(
    `Billing update: spent=${costAmount} limit=${budgetAmount} overBudget=${overBudget}`,
  );
};
