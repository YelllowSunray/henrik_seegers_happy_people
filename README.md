# Happy People — Henrik Seegers

Spiritual media + membership club site for Henrik Seegers.

## Stack

- Next.js 16 (App Router) + Tailwind v4
- next-intl (NL / EN / DE)
- Firebase Auth, Firestore, Storage
- Stripe subscriptions (€1/month, 30-day trial)

## Club features

| Feature | Access |
|---------|--------|
| Public blog & seminar samples | Everyone |
| Full seminar recordings | Members |
| Personal vlogs | Members |
| Short quotes / messages feed | Members |
| Member-only teachings | Members |
| Personal inbox messages from Henk | Members |

## Setup

1. Copy `.env.example` → `.env.local` (Firebase client values are already filled if you used the project config).
2. Enable **Email/Password** auth in Firebase Console.
3. Deploy `firestore.rules`.
4. Create a Stripe product/price (€1/month), then set:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET` (endpoint: `/api/stripe/webhook`)
5. Add Firebase Admin service account for checkout/webhooks:
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
6. Set `NEXT_PUBLIC_ADMIN_EMAILS` to Henrik’s login email.
7. `npm run dev` → [http://localhost:3000/nl](http://localhost:3000/nl)

Without Stripe keys, any signed-in user can **preview** the members area.

## Scripts

```bash
npm run dev
npm run build
npm run start
```
# henrik_seegers_happy_people
