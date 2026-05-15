import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { getAuthUserId, pollCanBeViewedByUser, PollRecord } from "@/lib/actions/poll.actions";
import { notFound } from "next/navigation";
import VotingClientUI from "./voting-client";

function resolveEndAt(value: PollRecord["endAt"]) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if ("toDate" in value && typeof value.toDate === "function") return value.toDate();
  return null;
}

function resolveTimestamp(value?: { toDate?: () => Date }) {
  if (!value || typeof value.toDate !== "function") return null;
  return value.toDate();
}

async function getPollAndVote(pollId: string) {
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    userId = await getAuthUserId();
    if (userId) {
      const userRecord = await adminAuth.getUser(userId);
      userEmail = userRecord.email || null;
    }
  } catch {
    // Unauthenticated request
  }

  const pollDoc = await adminDb.collection("polls").doc(pollId).get();
  if (!pollDoc.exists) return null;
  
  const pollData = pollDoc.data() as PollRecord;
  const endAt = resolveEndAt(pollData.endAt);
  
  // Auto-close check (FR14)
  if (pollData.status === "open" && endAt && endAt < new Date()) {
    pollData.status = "closed";
    // Fire and forget
    adminDb.collection("polls").doc(pollId).update({ status: "closed" }).catch(() => {});
  }

  // Access check
  if (!userId || !(await pollCanBeViewedByUser(pollData, userId, userEmail))) {
    return { status: "forbidden" };
  }

  // Strip sensitive PII before sending to the client (Fixes FR31/PII Leak)
  const { allowedEmails, inviteeIds, ...safePollData } = pollData;

  const poll = {
    id: pollDoc.id,
    ...safePollData,
    createdAt: resolveTimestamp(pollData.createdAt)?.toISOString(),
    updatedAt: resolveTimestamp(pollData.updatedAt)?.toISOString(),
    endAt: endAt?.toISOString() || null,
  };

  let myVote = null;
  if (userId) {
    const voteDoc = await adminDb.collection("polls").doc(pollId).collection("votes").doc(userId).get();
    if (voteDoc.exists) {
      myVote = voteDoc.data()!.selectedOptionIds;
    }
  }

  return { status: "ok", poll, myVote, userId };
}

export default async function PollDetailPage({ params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params;
  const result: any = await getPollAndVote(pollId);
  
  if (!result) {
    notFound();
  }

  if (result.status === "forbidden") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-xl border border-red-200 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">You do not have access to this poll</h1>
          <p className="mt-3 text-gray-600">
            Private polls can only be opened by the creator or invited users. Ask the poll creator to invite your account if this was shared with you by mistake.
          </p>
        </div>
      </div>
    );
  }

  const { poll, myVote, userId } = result;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              poll.status === 'open' ? "bg-green-100 text-green-800" :
              poll.status === 'closed' ? "bg-red-100 text-red-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {poll.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-500 font-medium">
              By {poll.creatorName}
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{poll.title}</h1>
          {poll.description && (
            <p className="text-gray-600 mt-2 text-lg">{poll.description}</p>
          )}
        </div>

        {poll.status === "draft" && userId !== poll.creatorId ? (
          <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl">This poll has not been published yet.</div>
        ) : (
          <VotingClientUI poll={poll} initialMyVote={myVote} userId={userId} />
        )}
      </div>
    </div>
  );
}
