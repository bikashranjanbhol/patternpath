// Gives a Firebase user the admin role (custom claim + users/{uid}.role).
//   FIREBASE_SERVICE_ACCOUNT_JSON='…' FIREBASE_PROJECT_ID=… npm run make-admin -- you@gmail.com
// The user must sign out and in again for the claim to reach their session.

import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const projectId = process.env.FIREBASE_PROJECT_ID;
initializeApp(serviceAccount ? { credential: cert(JSON.parse(serviceAccount)), projectId } : { projectId });

async function main() {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: true });
  await getFirestore().collection("users").doc(user.uid).set({ role: "admin" }, { merge: true });
  console.log(`${email} is now an admin. Ask them to sign out and sign in again.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
