# PatternPath

LeetCode problems grouped by pattern, with step-by-step dry runs from brute force to optimal.
Brute-force solutions are free; optimized solutions are Premium.

Stack (see the High-Level Design doc): **Next.js 16** on **Firebase App Hosting**, **Firebase Auth
(Google only)**, **Cloud Firestore**, **Cashfree** for payments.

## Run it in 1 minute (no Firebase needed)

```bash
npm install
cp .env.example .env.local   # defaults: DATA_SOURCE=local, PAYMENT_GATEWAY=mock
npm run dev
```

Open http://localhost:3000. On **Sign in**, use *Dev sign-in (Free)* or *Dev sign-in (Premium)*.
Checkout goes to a test "pay" screen where you can succeed or fail a payment.
In local mode, content comes from `src/content/seed.ts` and accounts live in memory.

## Run against Firebase

1. Create a Firebase project, enable **Authentication → Google**, create a **Firestore** database,
   and upgrade to the **Blaze** plan (App Hosting needs it; you pay only above the free limits).
2. Add a web app in the console and copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables.
3. Set `DATA_SOURCE=firestore` and either use the emulators:

   ```bash
   npx firebase-tools emulators:start          # auth :9099, firestore :8080, UI :4000
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=demo-patternpath npm run seed
   ```

   or a real project with `FIREBASE_SERVICE_ACCOUNT_JSON` (never commit it) and `npm run seed`.
4. Deploy rules and indexes: `npx firebase-tools deploy --only firestore`.

## Payments (Cashfree)

1. Create a Cashfree merchant account and get **sandbox** keys.
2. Set `PAYMENT_GATEWAY=cashfree`, `CASHFREE_CLIENT_ID`, `CASHFREE_CLIENT_SECRET`.
3. Webhook URL: `https://<your-domain>/api/payments/webhook`. Premium is unlocked only by the
   signed webhook or by the server asking Cashfree for the order status, never by the browser.
4. Plans are one-time payments for 1, 3 or 12 months (no auto-debit at launch).

The mock gateway refuses to run unless `DATA_SOURCE=local` (or `ALLOW_MOCK_PAYMENTS=true` on a
staging project), so it can never hand out free Premium in production.

## Deploy (Firebase App Hosting)

Connect the GitHub repo in **Firebase console → App Hosting**. Settings are in `apphosting.yaml`
(fill in the `REPLACE` values; store Cashfree keys as secrets:
`firebase apphosting:secrets:set CASHFREE_CLIENT_SECRET`). `minInstances: 0` keeps idle cost at zero.
Set a budget alert in Google Cloud Billing.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm test` | Unit tests (pricing, Premium periods, access boundary, webhook signatures) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run seed` | Write seed content to Firestore |

## Where things live

| Path | What |
| --- | --- |
| `src/app/problems/[problemId]` | Solution walkthrough: approaches, dry-run player, paywall |
| `src/lib/walkthrough.ts` | **The Premium boundary**: what the browser may see per approach |
| `src/lib/session.ts` | Session cookie, current user, Premium check |
| `src/lib/content.ts` | Cached content reads (`"use cache"`, refreshed hourly) |
| `src/lib/data/` | Data stores: Firestore and local (in-memory) |
| `src/lib/payments/` | Gateway interface, Cashfree adapter, webhook parsing, fulfilment |
| `src/content/seed.ts` | Seed content: 16 patterns, 2 problems with dry runs, 4 concept articles |
| `firestore.rules`, `firestore.indexes.json` | From the Database Design doc |

## Not built yet

Admin panel for content, dashboard progress and streaks, review drills, discussion comments,
Java/C++/JS solution code, renewal reminder emails, and auto-renewing plans.
