import { adminDb } from "@/lib/firebase/admin";
import { redirect, notFound } from "next/navigation";

export default async function ShareTokenResolver({ params }: { params: { token: string } }) {
  const tokenDoc = await adminDb.collection("shareTokens").doc(params.token).get();
  
  if (!tokenDoc.exists) {
    notFound();
  }

  const { pollId } = tokenDoc.data()!;
  
  // NOTE: Business Requirement 4 explicitly states that knowing the URL alone
  // does not grant access to a private poll. They must also be invited.
  // Therefore, we just redirect them to the poll detail view, which will natively
  // enforce the read-access rules (FR20/FR21).
  
  redirect(`/poll/${pollId}`);
}