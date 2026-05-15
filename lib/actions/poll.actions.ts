"use server";

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { CreatePollInput } from "@/lib/validators/poll.schema";

type PollOptionRecord = {
  id: string;
  label: string;
  order: number;
  voteCount: number;
};

export type PollRecord = {
  id?: string;
  title: string;
  description: string | null;
  type: "single" | "multi";
  visibility: "public" | "private";
  resultsVisibility: "always" | "after_voting";
  status: "draft" | "open" | "closed";
  shareToken: string;
  creatorId: string;
  creatorName: string;
  endAt: { toDate?: () => Date } | Date | null;
  createdAt?: { toDate?: () => Date };
  updatedAt?: { toDate?: () => Date };
  totalRespondents: number;
  allowedEmails?: string[];
  inviteeIds?: string[];
  options: PollOptionRecord[];
};

export type PollTemplate = {
  id: string;
  title: string;
  description?: string;
  type: "single" | "multi";
  visibility: "public" | "private";
  resultsVisibility: "always" | "after_voting";
  endAt?: string;
  options: { label: string }[];
  allowedEmails: string[];
  status: "draft" | "open" | "closed";
  updatedAt?: string;
};

// Utility to get authenticated user ID from session cookie securely
export async function getAuthUserId() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");
  try {
    const decodedTicket = await adminAuth.verifySessionCookie(session);
    return decodedTicket.uid;
  } catch {
    throw new Error("Unauthorized");
  }
}

export async function getAuthUserContext() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) throw new Error("Unauthorized");

  try {
    const decodedTicket = await adminAuth.verifySessionCookie(session);
    const userRecord = await adminAuth.getUser(decodedTicket.uid);

    return {
      uid: decodedTicket.uid,
      email: userRecord.email?.toLowerCase() || null,
    };
  } catch {
    throw new Error("Unauthorized");
  }
}

function normalizeAllowedEmails(emails?: string[]) {
  return (emails || [])
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

function buildPollOptions(options: CreatePollInput["options"]) {
  return options.map((opt, index) => ({
    id: crypto.randomBytes(8).toString("hex"),
    label: opt.label.trim(),
    order: index,
    voteCount: 0,
  }));
}

function canUserAccessPoll(poll: PollRecord, userId: string, _userEmail: string | null) {
  if (poll.creatorId === userId) return true;
  if (poll.status === "draft") return false;
  if (poll.visibility === "public") return true;
  if (poll.inviteeIds?.includes(userId)) return true;
  return false;
}

export async function createPoll(data: CreatePollInput) {
  const userId = await getAuthUserId();
  
  // We should also get the user's name to denormalize it
  const userDoc = await adminDb.collection("users").doc(userId).get();
  const userName = userDoc.data()?.name || "Unknown";

  const shareToken = crypto.randomBytes(16).toString("base64url");
  
  const pollData = {
    title: data.title.trim(),
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
    allowedEmails: data.visibility === "private" ? normalizeAllowedEmails(data.allowedEmails) : [],
    inviteeIds: [],
    options: buildPollOptions(data.options),
  };

  const batch = adminDb.batch();
  const pollRef = adminDb.collection("polls").doc();

  batch.set(pollRef, pollData);
  batch.set(adminDb.collection("shareTokens").doc(shareToken), { pollId: pollRef.id });

  await batch.commit();

  return { success: true, pollId: pollRef.id };
}

export async function updateDraftPoll(pollId: string, data: CreatePollInput) {
  const userId = await getAuthUserId();
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();

  if (!pollDoc.exists) throw new Error("Poll not found");

  const poll = pollDoc.data() as PollRecord;
  if (poll.creatorId !== userId) throw new Error("Forbidden");
  if (poll.status !== "draft") throw new Error("Only draft polls can be edited");

  const batch = adminDb.batch();
  const nextVisibility = data.visibility;
  const normalizedAllowedEmails = nextVisibility === "private" ? normalizeAllowedEmails(data.allowedEmails) : [];

  batch.update(pollRef, {
    title: data.title.trim(),
    description: data.description || null,
    type: data.type,
    visibility: nextVisibility,
    resultsVisibility: data.resultsVisibility,
    endAt: data.endAt ? new Date(data.endAt) : null,
    allowedEmails: normalizedAllowedEmails,
    options: buildPollOptions(data.options),
    updatedAt: FieldValue.serverTimestamp(),
    ...(nextVisibility === "public" ? { inviteeIds: [] } : {}),
  });

  if (nextVisibility === "public") {
    const invitesSnapshot = await pollRef.collection("invites").get();
    invitesSnapshot.docs.forEach((inviteDoc) => {
      batch.delete(inviteDoc.ref);
    });
  }

  await batch.commit();
  return { success: true };
}

export async function getRecentPollTemplates(limitCount = 5, excludePollId?: string): Promise<PollTemplate[]> {
  const userId = await getAuthUserId();
  const snapshot = await adminDb
    .collection("polls")
    .where("creatorId", "==", userId)
    .get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data() as PollRecord;
      return {
        id: doc.id,
        title: data.title,
        description: data.description || "",
        type: data.type,
        visibility: data.visibility,
        resultsVisibility: data.resultsVisibility,
        endAt:
          data.endAt && "toDate" in data.endAt && typeof data.endAt.toDate === "function"
            ? data.endAt.toDate()?.toISOString()
            : undefined,
        options: [...(data.options || [])]
          .sort((a, b) => a.order - b.order)
          .map((option) => ({ label: option.label })),
        allowedEmails: data.allowedEmails || [],
        status: data.status,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString() || "",
      };
    })
    .filter((poll) => poll.id !== excludePollId)
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""))
    .slice(0, limitCount);
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
  const poll = pollDoc.data() as PollRecord;
  if (poll.creatorId !== userId) throw new Error("Forbidden");
  if (poll.status !== "draft") throw new Error("Only draft polls can be published");
  if (!poll.options || poll.options.length < 2) throw new Error("A poll needs at least two options to publish");

  const invalidOption = poll.options.some((option) => !option.label?.trim());
  if (invalidOption) throw new Error("Every option must have a label before publishing");

  const endAtDate =
    poll.endAt && "toDate" in poll.endAt && typeof poll.endAt.toDate === "function"
      ? poll.endAt.toDate()
      : poll.endAt instanceof Date
        ? poll.endAt
        : null;

  if (endAtDate && endAtDate <= new Date()) {
    throw new Error("Poll expiry must be in the future when publishing");
  }
  
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
  const poll = pollDoc.data() as PollRecord;
  if (poll.creatorId !== userId) throw new Error("Forbidden");
  if (poll.status !== "open") throw new Error("Only open polls can be closed");
  
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
  const poll = pollDoc.data() as PollRecord;
  if (poll.creatorId !== userId) throw new Error("Forbidden");
  if (poll.status !== "open") throw new Error("Only open polls can be extended");
  
  const endAtDate = new Date(newEndAt);
  if (Number.isNaN(endAtDate.getTime()) || endAtDate <= new Date()) throw new Error("End time must be in the future");
  
  await pollRef.update({
    endAt: endAtDate,
    updatedAt: FieldValue.serverTimestamp()
  });
  
  return { success: true };
}

export async function assertPollAccess(pollId: string) {
  const user = await getAuthUserContext();
  const pollRef = adminDb.collection("polls").doc(pollId);
  const pollDoc = await pollRef.get();

  if (!pollDoc.exists) {
    throw new Error("Poll not found");
  }

  const poll = pollDoc.data() as PollRecord;

  if (!canUserAccessPoll(poll, user.uid, user.email)) {
    throw new Error("You do not have access to this poll");
  }

  return { user, pollRef, pollDoc, poll };
}

export async function pollCanBeViewedByUser(poll: PollRecord, userId: string, userEmail: string | null) {
  return canUserAccessPoll(poll, userId, userEmail);
}
