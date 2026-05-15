import { adminDb } from "@/lib/firebase/admin";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Clock, Vote } from "lucide-react";

async function getPublicFeed() {
  const snapshot = await adminDb
    .collection("polls")
    .where("visibility", "==", "public")
    .where("status", "==", "open")
    .orderBy("createdAt", "desc")
    .limit(20)
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
    };
  });
}

export default async function FeedPage() {
  let polls;
  try {
    polls = await getPublicFeed();
  } catch (error) {
    return <div>Error loading feed. We are looking into it!</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Public Feed</h1>
        <p className="text-gray-500">Discover and vote on active public polls created by the community.</p>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
          <Vote size={32} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No public polls right now</h3>
          <p className="text-gray-500 mt-1">Be the first to create one!</p>
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
                <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {poll.title}
                </h3>
                {poll.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {poll.description}
                  </p>
                )}
                <div className="text-xs text-gray-400 mt-2 font-medium">By {poll.creatorName}</div>
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
