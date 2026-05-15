import { adminDb } from "@/lib/firebase/admin";
import { redirect, notFound } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthUserId } from "@/lib/actions/poll.actions";

export default async function ShareTokenResolver({ params }: { params: { token: string } }) {
  const tokenDoc = await adminDb.collection("shareTokens").doc(params.token).get();
  
  if (!tokenDoc.exists) {
    notFound();
  }

  const { pollId } = tokenDoc.data()!;
  
  // If the user is logged in, auto-add them to the inviteeIds to grant access for private polls
  // via the secret link.
  let userId: string | null = null;
  try {
    userId = await getAuthUserId();
  } catch {
    // Unauthenticated
  }

  if (userId) {
    const pollRef = adminDb.collection("polls").doc(pollId);
    await pollRef.update({
      inviteeIds: FieldValue.arrayUnion(userId)
    });
  }
  
  redirect(`/poll/${pollId}`);
}