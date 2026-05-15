import { adminDb } from "@/lib/firebase/admin";
import { getAuthUserId } from "@/lib/actions/poll.actions";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { BarChart2, Users, FileLock2, Globe, Clock, CheckCircle2 } from "lucide-react";

async function getMyPolls(userId: string) {
  const snapshot = await adminDb
    .collection("polls")
    .where("creatorId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      status: data.status,
      visibility: data.visibility,
      totalRespondents: data.totalRespondents || 0,
      createdAt: data.createdAt?.toDate(),
      endAt: data.endAt?.toDate() || null,
    };
  });
}

export default async function MyPollsPage() {
  let userId: string;
  try {
    userId = await getAuthUserId();
  } catch {
    return <div>Unauthorized. Please log in again.</div>;
  }

  const polls = await getMyPolls(userId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Polls</h1>
          <p className="text-gray-500">Manage and track your active, draft, and closed polls.</p>
        </div>
        <Link 
          href="/my-polls/create" 
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition"
        >
          Create New Poll
        </Link>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300">
          <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600">
            <BarChart2 size={24} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No polls yet</h3>
          <p className="mt-2 text-sm text-gray-500 mb-6">Create your first poll to start gathering feedback from your audience.</p>
          <Link 
            href="/my-polls/create" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            + Create your first poll
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {polls.map((poll) => (
            <Link 
              key={poll.id} 
              href={`/my-polls/${poll.id}/edit`} // Always link to edit/dashboard view of the poll
              className="bg-white group overflow-hidden border border-gray-200 rounded-xl hover:shadow-md transition duration-200 flex flex-col"
            >
              <div className="p-5 flex-1 relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex space-x-2">
                    {poll.status === 'open' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle2 size={12} className="mr-1"/> Active</span>}
                    {poll.status === 'draft' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Draft</span>}
                    {poll.status === 'closed' && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Closed</span>}
                    
                    {poll.visibility === 'public' ? (
                      <span className="inline-flex items-center text-xs font-medium text-gray-500" title="Publicly accessible via share link">
                        <Globe size={14} className="mr-1" /> Public
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-gray-500" title="Invitation only">
                        <FileLock2 size={14} className="mr-1" /> Private
                      </span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {poll.title}
                </h3>
                
                {poll.description && (
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                    {poll.description}
                  </p>
                )}
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
