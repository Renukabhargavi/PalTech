import { adminDb } from "@/lib/firebase/admin";
import { getAuthUserId } from "@/lib/actions/poll.actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import PollManagementActions from "./management-actions";
import InviteManager from "./invite-manager";
import { getInvites } from "@/lib/actions/invite.actions";

async function getPoll(pollId: string) {
  const pollDoc = await adminDb.collection("polls").doc(pollId).get();
  if (!pollDoc.exists) return null;
  const data = pollDoc.data()!;
  return {
    id: pollDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate().toISOString(),
    updatedAt: data.updatedAt?.toDate().toISOString(),
    endAt: data.endAt?.toDate().toISOString() || null,
  };
}

export default async function PollManagementPage({ params }: { params: Promise<{ pollId: string }> }) {
  const { pollId } = await params;
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return <div>Unauthorized</div>;
  }

  const poll: any = await getPoll(pollId);
  
  if (!poll) notFound();
  if (poll.creatorId !== userId) return <div className="text-red-500">Forbidden - You did not create this poll.</div>;

  let invites: any[] = [];
  if (poll.visibility === "private") {
    invites = await getInvites(poll.id);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6">
        <Link href="/my-polls">← Back to My Polls</Link>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{poll.title}</h1>
            <p className="text-gray-500 mt-1">{poll.description || "No description provided."}</p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${
            poll.status === 'draft' ? "bg-gray-100 text-gray-800" :
            poll.status === 'open' ? "bg-green-100 text-green-800" :
            "bg-red-100 text-red-800"
          }`}>
            {poll.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Type</p>
            <p className="font-medium text-gray-900 mt-1 capitalize">{poll.type}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Visibility</p>
            <p className="font-medium text-gray-900 mt-1 capitalize">{poll.visibility}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Votes</p>
            <p className="font-medium text-gray-900 mt-1">{poll.totalRespondents}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Share Link</p>
            <p className="font-mono text-xs text-blue-600 mt-1 truncate">/p/{poll.shareToken}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Poll Options</h3>
          <div className="space-y-3">
            {poll.options.sort((a: any, b: any) => a.order - b.order).map((opt: any) => (
              <div key={opt.id} className="flex justify-between items-center p-3 rounded-md border border-gray-200">
                <span className="font-medium text-gray-800">{opt.label}</span>
                <span className="text-gray-500 font-medium">{opt.voteCount} votes</span>
              </div>
            ))}
          </div>
        </div>

      </div>
      
      {/* Interactive client component for mutation actions */}
      <PollManagementActions poll={poll} />
      
      {poll.visibility === "private" && (
        <InviteManager pollId={poll.id} existingInvites={invites} />
      )}
    </div>
  );
}
