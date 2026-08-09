/**
 * Google Cloud Function (2nd gen) — Pub/Sub trigger from a GCP Billing Budget.
 * Sets Firestore system/billing.overBudget = true when spend crosses the budget.
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

exports.firebaseBudgetHardStop = async (message) => {
  const data = message?.data
    ? JSON.parse(Buffer.from(message.data, "base64").toString())
    : {};

  const ratio =
    data.costAmount && data.budgetAmount
      ? Number(data.costAmount) / Number(data.budgetAmount)
      : 1;

  // Hard-stop when budget is fully consumed (or alert payload is missing amounts).
  if (ratio < 1 && data.costAmount != null && data.budgetAmount != null) {
    console.log(`Budget alert below 100% (${ratio}); no hard-stop.`);
    return;
  }

  await getFirestore()
    .doc("system/billing")
    .set(
      {
        overBudget: true,
        limitEur: 100,
        updatedAt: new Date().toISOString(),
        lastAlert: data,
        triggeredAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  console.log("Set system/billing.overBudget = true");
};
