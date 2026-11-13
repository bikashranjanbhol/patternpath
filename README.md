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

Open http://localhost:3000. On **Sign in**, use *Dev sign-in (Free)*, *(Premium)* or *(Admin)*.
Checkout goes to a test "pay" screen where you can succeed or fail a payment.
In local mode, content comes from `src/content/seed.ts` and accounts live in memory.

## Author content (admin)

Sign in as **Admin** and open `/admin`.

1. **New problem**: number, title, pattern, a short description in your own words, and one
   example (`s = "abcabcbb"` → `3`). The ID and LeetCode link fill in from the title.
   New problems are drafts; tick **Published** when the solutions are ready.
2. **Add solution** opens the *solution studio*. Paste the Python solution and click
   **Record dry run**. Python runs in your browser (Pyodide), every line is recorded, and the
   tool drafts the steps: highlighted line, changed variables, the window and pointers,
   True/False for each condition, and a first-draft note.
3. Rewrite the notes in plain words, link concepts, hide noisy variables, pick the window
   variables if the guess is wrong, and watch the **Preview** (the real player).
4. **Save**. First solution defaults to *Free*, later ones to *Premium*.

Where saves go:

- **Local mode**: `content/authored/<problem-id>.json` (overrides the seed). Commit and push;
  Vercel redeploys with the new problem. The Vercel demo itself is read-only.
- **Firestore mode**: straight into the database. Make yourself admin once with
  `npm run make-admin -- you@gmail.com`, then sign out and in.

**Download JSON** on either screen gives you the same file to share or review.

### Or write a problem as a source file

`content/sources/<problem-id>.ts` holds the problem, each solution's Python code, the example
to record, what to draw, and one note per step (see `1-two-sum.ts`). Then:

```bash
npm run record -- 1-two-sum --draft   # print the drafted steps to write notes from
npm run record -- 1-two-sum           # record and write content/authored/1-two-sum.json
```

The note count must match the step count, so notes can't silently land on the wrong line
after the code changes. Needs `python3`.

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

## Deploy a demo on Vercel

The app runs on Vercel in demo mode with no database: the session (including Premium) lives in a
signed cookie and test orders are signed snapshots, so nothing depends on server memory.
Set these environment variables in the Vercel project:

| Variable | Value |
| --- | --- |
| `DATA_SOURCE` | `local` |
| `PAYMENT_GATEWAY` | `mock` |
| `DEV_SESSION_SECRET` | a long random string (marked Sensitive) |

Anyone with the link can use *Dev sign-in (Premium)*, so treat it as a demo, not the product.
For real users, switch to `DATA_SOURCE=firestore` and `PAYMENT_GATEWAY=cashfree` (see above).
Vercel's Hobby plan is for non-commercial use; move to Pro (or Firebase App Hosting) before charging.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm test` | Unit tests (pricing, Premium periods, access boundary, webhook signatures) |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run seed` | Write seed content to Firestore |
| `npm run record -- <id> [--draft]` | Record a problem from `content/sources/` |
| `npm run make-admin -- <email>` | Give a Google account the admin role (Firestore mode) |

## Where things live

| Path | What |
| --- | --- |
| `src/app/problems/[problemId]` | Solution walkthrough: approaches, dry-run player, paywall |
| `src/lib/walkthrough.ts` | **The Premium boundary**: what the browser may see per approach |
| `src/lib/session.ts` | Session cookie, current user, Premium check |
| `src/lib/content.ts` | Cached content reads (`"use cache"`, refreshed hourly) |
| `src/lib/data/` | Data stores: Firestore and local (in-memory) |
| `src/lib/payments/` | Gateway interface, Cashfree adapter, webhook parsing, fulfilment |
| `src/app/admin/` | Content authoring: problem editor and solution studio |
| `src/lib/authoring/` | Python tracer (Pyodide), trace → steps, save schemas |
| `content/sources/` | Problems written as source files (code, example, notes) |
| `content/authored/` | Problems saved by the authoring tool in local mode |
| `src/content/seed.ts` | Seed content: 16 patterns, 2 problems with dry runs, 4 concept articles |
| `firestore.rules`, `firestore.indexes.json` | From the Database Design doc |

## Not built yet

Dashboard progress and streaks, review drills, discussion comments,
Java/C++/JS solution code (the studio records Python only; other languages need their line mapping added by hand), renewal reminder emails, and auto-renewing plans.
