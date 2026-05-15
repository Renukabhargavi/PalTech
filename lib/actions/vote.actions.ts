"use server";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { assertPollAccess } from "./poll.actions";

export async function castVote(pollId: string, selectedOptionIds: string[]) {
  const { user, pollRef, poll } = await assertPollAccess(pollId);
  const userId = user.uid;
  const normalizedSelection = [...new Set(selectedOptionIds)];

  if (poll.type === "single" && normalizedSelection.length !== 1) {
    throw new Error("Single-choice polls require exactly one option");
  }

  if (poll.type === "multi" && normalizedSelection.length < 1) {
    throw new Error("Multi-choice polls require at least one option");
  }

  const optionIds = new Set((poll.options || []).map((option) => option.id));
  const invalidOption = normalizedSelection.find((optionId) => !optionIds.has(optionId));
  if (invalidOption) {
    throw new Error("One or more selected options do not belong to this poll");
  }

  const voteRef = pollRef.collection("votes").doc(userId);

  // Firestore transaction to guarantee atomic voting
  await adminDb.runTransaction(async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists) throw new Error("Poll not found");
    
    const poll = pollDoc.data()!;
    const endAt = poll.endAt?.toDate?.();
    if (poll.status === "open" && endAt && endAt <= new Date()) {
      transaction.update(pollRef, {
        status: "closed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new Error("Poll is closed");
    }
    if (poll.status !== "open") throw new Error("Poll is closed or not published yet");

    const voteDoc = await transaction.get(voteRef);
    
    const currentOptions = [...poll.options];
    
    if (voteDoc.exists) {
      const previousVote = voteDoc.data()!;
      const prevIds: string[] = previousVote.selectedOptionIds;
      
      for (const oldId of prevIds) {
        const idx = currentOptions.findIndex(o => o.id === oldId);
        if (idx !== -1) currentOptions[idx].voteCount = Math.max(0, currentOptions[idx].voteCount - 1);
      }
      
      for (const newId of normalizedSelection) {
        const idx = currentOptions.findIndex(o => o.id === newId);
        if (idx !== -1) currentOptions[idx].voteCount++;
      }
      
      transaction.update(voteRef, {
        selectedOptionIds: normalizedSelection,
        updatedAt: FieldValue.serverTimestamp()
      });
      
      transaction.update(pollRef, {
        options: currentOptions,
        updatedAt: FieldValue.serverTimestamp()
      });

    } else {
      for (const newId of normalizedSelection) {
        const idx = currentOptions.findIndex(o => o.id === newId);
        if (idx !== -1) currentOptions[idx].voteCount++;
      }
      
      transaction.set(voteRef, {
        voterId: userId,
        selectedOptionIds: normalizedSelection,
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
  const { user, pollRef } = await assertPollAccess(pollId);
  const userId = user.uid;
  const voteRef = pollRef.collection("votes").doc(userId);

  await adminDb.runTransaction(async (transaction) => {
    const pollDoc = await transaction.get(pollRef);
    if (!pollDoc.exists) throw new Error("Poll not found");
    const poll = pollDoc.data()!;
    const endAt = poll.endAt?.toDate?.();
    if (poll.status === "open" && endAt && endAt <= new Date()) {
      transaction.update(pollRef, {
        status: "closed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      throw new Error("Poll is closed");
    }
    if (poll.status !== "open") throw new Error("Poll is closed or not published yet");

    const voteDoc = await transaction.get(voteRef);
    if (!voteDoc.exists) throw new Error("You have not voted");

    const previousVote = voteDoc.data()!;
    const prevIds: string[] = previousVote.selectedOptionIds;

    const currentOptions = [...poll.options];
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
