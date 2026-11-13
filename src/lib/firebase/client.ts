"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";

// Browser-side Firebase, used only for the Google sign-in popup. Everything
// else goes through our API with the http-only session cookie.

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let auth: Auth | undefined;

function clientAuth(): Auth {
  if (auth) return auth;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  const emulator = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
  if (emulator) connectAuthEmulator(auth, emulator, { disableWarnings: true });
  return auth;
}

/** Opens the Google popup and turns the result into a server session. */
export async function signInWithGoogle() {
  const a = clientAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(a, provider);
  await postIdToken(await cred.user.getIdToken());
}

/**
 * After a purchase the Premium claim changes on the server. This fetches a
 * fresh ID token (with the new claim) and re-issues the session cookie.
 */
export async function refreshSession() {
  const user = clientAuth().currentUser;
  if (!user) return false;
  await postIdToken(await user.getIdToken(true));
  return true;
}

async function postIdToken(idToken: string) {
  const res = await fetch("/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "sign_in_failed");
}

export async function signOutEverywhere() {
  await fetch("/api/session", { method: "DELETE" });
  await signOut(clientAuth()).catch(() => undefined);
}
