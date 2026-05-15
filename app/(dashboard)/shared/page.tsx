import { adminDb } from "@/lib/firebase/admin";
import { getAuthUserId } from "@/lib/actions/poll.actions";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Clock, Mail } from "lucide-react";

async function getSharedPolls(userId: string) {
  const snapshot = await adminDb
    .collection("polls")
    .where("inviteeIds", "array-contains", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      creatorName: data.creatorName || "Anonymous",
      totalRespondents: data.totalRespondents || 0,
      createdAt: data.createdAt?.toDate(),
      status: data.status,
    };
  });
}

export default async function SharedPage() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return <div>Unauthorized. Please log in again.</div>;
  }

  const polls = await getSharedPolls(userId);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Shared with me</h1>
        <p className="text-gray-500">Private polls you have been invited to participate in.</p>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300">
          <Mail size={32} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No shared polls</h3>
          <p className="text-gray-500 mt-1 mb-6">When someone invites you to a private poll, it will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => (
            <Link 
              key={poll.id} 
              href={`/poll/${poll.id}`}
              className="bg-white group overflow-hidden border border-gray-200 rounded-xl hover:shadow-md transition duration-200 flex flex-col"
            >
              <div className="p-5 flex-1 relative">
                <div className="mb-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    poll.status === 'open' ? "bg-green-100 text-green-800" :
                    poll.status === 'closed' ? "bg-red-100 text-red-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {poll.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {poll.title}
                </h3>
                {poll.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {poll.description}
                  </p>
                )}
                <div className="text-xs text-gray-400 mt-2 font-medium">Invited by {poll.creatorName}</div>
              </div>
              
              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
                <div className="flex items-center text-xs text-gray-500 font-medium">
                  <Users size={14} className="mr-1.5" /> 
                  <span className="text-gray-700 font-semibold mr-1">{poll.totalRespondents}</span> votes
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  <Clock size={12} className="mr-1"/>
                  {poll.createdAt && formatDistanceToNow(poll.createdAt, { addSuffix: true })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
