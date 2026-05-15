import { adminDb } from "@/lib/firebase/admin";
import { getAuthUserId } from "@/lib/actions/poll.actions";
import { notFound } from "next/navigation";
import VotingClientUI from "./voting-client";

async function getPollAndVote(pollId: string) {
  let userId: string | null = null;
  try {
    userId = await getAuthUserId();
  } catch {
    // Unauthenticated request
  }

  const pollDoc = await adminDb.collection("polls").doc(pollId).get();
  if (!pollDoc.exists) return null;
  
  const pollData = pollDoc.data()!;
  
  // Auto-close check (FR14)
  if (pollData.status === "open" && pollData.endAt && pollData.endAt.toDate() < new Date()) {
    pollData.status = "closed";
    // Fire and forget
    adminDb.collection("polls").doc(pollId).update({ status: "closed" }).catch(() => {});
  }

  // Access check
  if (pollData.visibility === "private" && userId !== pollData.creatorId && !pollData.inviteeIds?.includes(userId)) {
    // If not creator and not invited, deny.
    return { status: "forbidden" };
  }

  const poll = {
    id: pollDoc.id,
    ...pollData,
    createdAt: pollData.createdAt?.toDate().toISOString(),
    updatedAt: pollData.updatedAt?.toDate().toISOString(),
    endAt: pollData.endAt?.toDate().toISOString() || null,
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

export default async function PollDetailPage({ params }: { params: { pollId: string } }) {
  const result: any = await getPollAndVote(params.pollId);
  
  if (!result || result.status === "forbidden") {
    notFound(); // 404 or a Forbidden page
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

        {!userId ? (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
            <p className="text-blue-800 mb-2">You must log in to participate in this poll.</p>
            <a href="/sign-in" className="text-blue-600 font-semibold hover:underline">Log in or create an account here.</a>
          </div>
        ) : poll.status === "draft" && userId !== poll.creatorId ? (
          <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-xl">This poll has not been published yet.</div>
        ) : (
          <VotingClientUI poll={poll} initialMyVote={myVote} userId={userId} />
        )}
      </div>
    </div>
  );
}