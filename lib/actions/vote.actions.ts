"use server";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthUserId } from "./poll.actions";

export async function castVote(pollId: string, selectedOptionIds: string[]) {
  const userId = await getAuthUserId();
  
  if (selectedOptionIds.length === 0) throw new Error("No options selected");

  const pollRef = adminDb.collection("polls").doc(pollId);
  const voteRef = pollRef.collection("votes").doc(userId);

  // Firestore transaction to guarantee atomic voting
  await adminDb.runTransaction(async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists) throw new Error("Poll not found");
    
    // Check status
    const poll = pollDoc.data()!;
    if (poll.status !== "open") throw new Error("Poll is closed or not published yet");

    const voteDoc = await transaction.get(voteRef);
    
    // We get the current options to manipulate voteCounts safely
    let currentOptions = [...poll.options];
    
    if (voteDoc.exists) {
      // User is changing their vote.
      const previousVote = voteDoc.data()!;
      const prevIds: string[] = previousVote.selectedOptionIds;
      
      // Decrease old counts
      for (const oldId of prevIds) {
        const idx = currentOptions.findIndex(o => o.id === oldId);
        if (idx !== -1) currentOptions[idx].voteCount = Math.max(0, currentOptions[idx].voteCount - 1);
      }
      
      // Increase new counts
      for (const newId of selectedOptionIds) {
        const idx = currentOptions.findIndex(o => o.id === newId);
        if (idx !== -1) currentOptions[idx].voteCount++;
      }
      
      transaction.update(voteRef, {
        selectedOptionIds,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      // Total respondents stays the same.
      transaction.update(pollRef, {
        options: currentOptions,
        updatedAt: FieldValue.serverTimestamp()
      });

    } else {
      // First time voting
      for (const newId of selectedOptionIds) {
        const idx = currentOptions.findIndex(o => o.id === newId);
        if (idx !== -1) currentOptions[idx].voteCount++;
      }
      
      transaction.set(voteRef, {
        voterId: userId,
        selectedOptionIds,
        votedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
      
      transaction.update(pollRef, {
        options: currentOptions,
        totalRespondents: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp()
      });
    }
  });

  return { success: true };
}

export async function withdrawVote(pollId: string) {
  const userId = await getAuthUserId();
  
  const pollRef = adminDb.collection("polls").doc(pollId);
  const voteRef = pollRef.collection("votes").doc(userId);

  await adminDb.runTransaction(async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists) throw new Error("Poll not found");
    const poll = pollDoc.data()!;
    if (poll.status !== "open") throw new Error("Poll is closed or not published yet");

    const voteDoc = await transaction.get(voteRef);
    if (!voteDoc.exists) throw new Error("You have not voted");

    const previousVote = voteDoc.data()!;
    const prevIds: string[] = previousVote.selectedOptionIds;

    let currentOptions = [...poll.options];
    for (const oldId of prevIds) {
      const idx = currentOptions.findIndex(o => o.id === oldId);
      if (idx !== -1) currentOptions[idx].voteCount = Math.max(0, currentOptions[idx].voteCount - 1);
    }

    transaction.delete(voteRef);

    transaction.update(pollRef, {
      options: currentOptions,
      totalRespondents: Math.max(0, poll.totalRespondents - 1),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  return { success: true };
}
