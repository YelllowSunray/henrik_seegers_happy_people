# Happy People — Hendrik Seegers

Spiritual media + membership club site for Hendrik Seegers.

## Stack

- Next.js 16 (App Router) + Tailwind v4
- next-intl (NL / EN / DE / ES / IT / FR / KO)
- Firebase Auth, Firestore, Storage
- Stripe subscriptions (€20/month or €200/year, 7-day free trial)

## Club features

| Feature | Access |
|---------|--------|
| Public blog & seminar samples | Everyone |
| Full seminar recordings | Members |
| Personal vlogs | Members |
| Short quotes / messages feed | Members |
| Member-only teachings | Members |
| Personal inbox messages from Henk | Members |
| Admin CMS | Henrik (admin) |

## Setup

1. Copy `.env.example` → `.env.local`.
2. Enable **Email/Password** auth in Firebase Console.
3. Deploy `firestore.rules`.
4. Create a Stripe product with two recurring prices (€20/month + €200/year), then set:
   - `STRIPE_PRICE_ID_MONTHLY`
   - `STRIPE_PRICE_ID_YEARLY`
   - plus publishable/secret/webhook keys  
   The app applies a **7-day trial** at checkout (no obligation; cancel anytime via Customer Portal).
5. Add Firebase Admin service account env vars.
6. Set admin allowlist:
   - `ADMIN_EMAILS=henk.seegers1965@gmail.com`
   - `NEXT_PUBLIC_ADMIN_EMAILS=henk.seegers1965@gmail.com`
7. Create / reset Henrik’s admin user:

```bash
npm run admin:ensure-user
```

Firebase Auth requires passwords ≥ 6 characters, so the script sets **`admin1`** (plan requested `admin`).

Sign in at `/auth`, then open **Admin** in the nav (`/admin`).

8. `npm run dev` → [http://localhost:3000/nl](http://localhost:3000/nl)

Without Stripe keys, any signed-in user can **preview** the members area.

## Admin CMS

Henrik can create / edit / delete:

- Blog posts (public or members-only)
- Upcoming seminars (`events`)
- Members media (`videos`: seminar / vlog / sample)
- Quotes
- Personal messages (by member email)

The site reads Firestore via the Admin SDK and falls back to seed data in `lib/content.ts` when a collection is empty. Publish from Admin (or import seed docs) to go live in CMS.

## Firebase €100 spend hard-stop

App kill-switch document: `system/billing` → `{ overBudget, limitEur: 100 }`.

When `overBudget: true`:

- Site-wide banner asks Henrik to contact **Samir Iyer** — `samir@samirdev.com` / `+31 687343078`
- Admin CMS writes are blocked (UI + Firestore rules)
- Stripe checkout is blocked

### GCP budget (ops)

1. Google Cloud Console → Billing → Budgets & alerts.
2. Create a **€100** budget on the Firebase/GCP project.
3. Alert emails: `henk.seegers1965@gmail.com` and `samir@samirdev.com` (50% / 90% / 100%).
4. Connect the budget to a **Pub/Sub** topic (e.g. `firebase-budget-alerts`).
5. Deploy [`functions/billing-budget/index.js`](functions/billing-budget/index.js) on that topic so 100% alerts set `system/billing.overBudget = true`.

Manual override (Samir only):

```bash
npm run admin:billing-off   # clear hard-stop after raising budget
npm run admin:billing-on    # force hard-stop (test)
```

Nuclear option in GCP: attach a budget action that disables billing (takes the whole project offline — use only if needed).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run admin:ensure-user
npm run admin:billing-on
npm run admin:billing-off
```
