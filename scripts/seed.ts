// Writes the seed content to Firestore (a real project or the emulator).
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=demo-patternpath npm run seed
// Safe to run again: documents are overwritten by ID.

import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { concepts, coupons, patterns, plans, problems, solutions } from "../src/content/seed";

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const projectId = process.env.FIREBASE_PROJECT_ID;
initializeApp(
  serviceAccount ? { credential: cert(JSON.parse(serviceAccount)), projectId } : { projectId },
);
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

async function main() {
  const now = Timestamp.now();
  const batch = db.batch();
  const strip = <T extends { id: string }>(x: T) => {
    const { id: _id, ...rest } = x;
    void _id;
    return rest;
  };

  for (const p of patterns) batch.set(db.collection("patterns").doc(p.id), { ...strip(p), updatedAt: now });
  for (const p of problems) batch.set(db.collection("problems").doc(p.id), { ...strip(p), updatedAt: now });
  for (const s of solutions) {
    const { problemId, ...rest } = strip(s);
    batch.set(db.collection("problems").doc(problemId).collection("solutions").doc(s.id), {
      ...rest,
      updatedAt: now,
    });
  }
  for (const c of concepts) {
    batch.set(db.collection("concepts").doc(c.id), { ...strip(c), commentCount: 0, updatedAt: now });
  }
  for (const p of plans) batch.set(db.collection("plans").doc(p.id), strip(p));
  for (const c of coupons) {
    const { code, ...rest } = c;
    batch.set(db.collection("coupons").doc(code), {
      ...rest,
      validFrom: Timestamp.fromMillis(c.validFrom),
      validUntil: Timestamp.fromMillis(c.validUntil),
    });
  }
  await batch.commit();
  console.log(
    `Seeded ${patterns.length} patterns, ${problems.length} problems, ${solutions.length} solutions, ` +
      `${concepts.length} concepts, ${plans.length} plans, ${coupons.length} coupons.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
