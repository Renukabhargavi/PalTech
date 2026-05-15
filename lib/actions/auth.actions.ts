"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function createSessionCookie(idToken: string) {
  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    return { success: true, sessionCookie, expiresIn };
  } catch (error) {
    console.error("Session creation error:", error);
    return { success: false, error: "Failed to create session" };
  }
}

export async function createUserDocument(uid: string, email: string, name: string) {
  try {
    await adminDb.collection("users").doc(uid).set({
      uid,
      email,
      name,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating user document:", error);
    return { success: false, error: "Failed to create user profile" };
  }
}
