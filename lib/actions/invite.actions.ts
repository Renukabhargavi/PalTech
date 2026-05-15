"use server";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthUserId } from "./poll.actions";

export async function inviteUserByEmail(pollId: string, email: string) {
  const userId = await getAuthUserId();
  
  // Verify creator
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();
  if (!pollDoc.exists) throw new Error("Poll not found");
  if (pollDoc.data()?.creatorId !== userId) throw new Error("Forbidden");
  if (pollDoc.data()?.visibility !== "private") throw new Error("Only private polls support invitations");

  const usersSnap = await adminDb.collection("users").where("email", "==", email.toLowerCase().trim()).limit(1).get();
  if (usersSnap.empty) {
    throw new Error("No user found with that email address");
  }

  const invitedUser = usersSnap.docs[0];
  const invitedUserId = invitedUser.id;
  
  if (invitedUserId === userId) {
    throw new Error("You cannot invite yourself");
  }

  const inviteRef = pollRef.collection("invites").doc(invitedUserId);
  const existingInvite = await inviteRef.get();
  if (existingInvite.exists) {
    throw new Error("User is already invited");
  }

  const creatorDoc = await adminDb.collection("users").doc(userId).get();
  const creatorName = creatorDoc.data()?.name || "Poll creator";

  const batch = adminDb.batch();
  batch.set(inviteRef, {
    userId: invitedUserId,
    userEmail: invitedUser.data()?.email,
    userName: invitedUser.data()?.name,
    invitedBy: userId,
    invitedByName: creatorName,
    invitedAt: FieldValue.serverTimestamp()
  });
  
  batch.update(pollRef, {
    inviteeIds: FieldValue.arrayUnion(invitedUserId)
  });

  await batch.commit();
  return { success: true };
}

export async function revokeInvite(pollId: string, invitedUserId: string) {
  const userId = await getAuthUserId();
  
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();
  if (!pollDoc.exists) throw new Error("Poll not found");
  if (pollDoc.data()?.creatorId !== userId) throw new Error("Forbidden");

  const batch = adminDb.batch();
  batch.delete(pollRef.collection("invites").doc(invitedUserId));
  batch.update(pollRef, {
    inviteeIds: FieldValue.arrayRemove(invitedUserId)
  });

  await batch.commit();
  return { success: true };
}

export async function getInvites(pollId: string) {
  const userId = await getAuthUserId();
  
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();
  if (!pollDoc.exists) throw new Error("Poll not found");
  if (pollDoc.data()?.creatorId !== userId) throw new Error("Forbidden");

  const invitesSnap = await pollRef.collection("invites").orderBy("invitedAt", "desc").get();
  return invitesSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id, // which is userId
      ...data,
      invitedAt: data.invitedAt?.toDate().toISOString()
    };
  });
}
