"use server";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

// Utility to get authenticated user ID from session cookie securely
export async function getAuthUserId() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  try {
    const decodedTicket = await adminAuth.verifySessionCookie(session);
    return decodedTicket.uid;
  } catch (e) {
    throw new Error("Unauthorized");
  }
}

export async function createPoll(data: any) {
  const userId = await getAuthUserId();
  
  // We should also get the user's name to denormalize it
  const userDoc = await adminDb.collection("users").doc(userId).get();
  const userName = userDoc.data()?.name || "Unknown";

  const shareToken = crypto.randomBytes(16).toString("base64url");
  
  const pollData: any = {
    title: data.title,
    description: data.description || null,
    type: data.type,
    visibility: data.visibility,
    resultsVisibility: data.resultsVisibility,
    status: "draft",
    shareToken,
    creatorId: userId,
    creatorName: userName,
    endAt: data.endAt ? new Date(data.endAt) : null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    totalRespondents: 0,
    allowedEmails: data.allowedEmails || [], // Users allowed if visibility is private
    options: data.options.map((opt: any, index: number) => ({
      id: crypto.randomBytes(8).toString("hex"),
      label: opt.label,
      order: index,
      voteCount: 0,
    })),
  };

  const batch = adminDb.batch();
  const pollRef = adminDb.collection("polls").doc();
  
  pollData.id = pollRef.id;

  batch.set(pollRef, pollData);
  batch.set(adminDb.collection("shareTokens").doc(shareToken), { pollId: pollRef.id });

  await batch.commit();

  return { success: true, pollId: pollRef.id };
}

export async function deleteDraft(pollId: string) {
  const userId = await getAuthUserId();
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();
  
  if (!pollDoc.exists) throw new Error("Poll not found");
  
  const poll = pollDoc.data();
  if (poll?.creatorId !== userId) throw new Error("Forbidden");
  if (poll?.status !== "draft") throw new Error("Cannot delete a published poll");

  const batch = adminDb.batch();
  batch.delete(pollRef);
  batch.delete(adminDb.collection("shareTokens").doc(poll?.shareToken));
  
  await batch.commit();
  return { success: true };
}
export async function publishPoll(pollId: string) {
  const userId = await getAuthUserId();
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();
  
  if (!pollDoc.exists) throw new Error("Poll not found");
  if (pollDoc.data()?.creatorId !== userId) throw new Error("Forbidden");
  
  await pollRef.update({
    status: "open",
    updatedAt: FieldValue.serverTimestamp()
  });
  
  return { success: true };
}

export async function closePoll(pollId: string) {
  const userId = await getAuthUserId();
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();
  
  if (!pollDoc.exists) throw new Error("Poll not found");
  if (pollDoc.data()?.creatorId !== userId) throw new Error("Forbidden");
  
  await pollRef.update({
    status: "closed",
    updatedAt: FieldValue.serverTimestamp()
  });
  
  return { success: true };
}

export async function extendPoll(pollId: string, newEndAt: string) {
  const userId = await getAuthUserId();
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();
  
  if (!pollDoc.exists) throw new Error("Poll not found");
  if (pollDoc.data()?.creatorId !== userId) throw new Error("Forbidden");
  if (pollDoc.data()?.status !== "open") throw new Error("Only open polls can be extended");
  
  const endAtDate = new Date(newEndAt);
  if (endAtDate < new Date()) throw new Error("End time must be in the future");
  
  await pollRef.update({
    endAt: endAtDate,
    updatedAt: FieldValue.serverTimestamp()
  });
  
  return { success: true };
}
