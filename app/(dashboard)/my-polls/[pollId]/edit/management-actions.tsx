"use client";

import { useState } from "react";
import { publishPoll, closePoll, deleteDraft, extendPoll } from "@/lib/actions/poll.actions";
import { useRouter } from "next/navigation";

export default function PollManagementActions({ poll }: { poll: any }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newEndAt, setNewEndAt] = useState<string>("");

  const handleAction = async (action: () => Promise<any>, redirect?: string) => {
    if (confirm("Are you sure?")) {
      setIsLoading(true);
      setError(null);
      try {
        await action();
        if (redirect) {
          router.push(redirect);
        } else {
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || "Failed Action");
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Management Actions</h3>
      
      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

      <div className="flex flex-wrap gap-4">
        {poll.status === "draft" && (
          <>
            <button 
              onClick={() => handleAction(() => publishPoll(poll.id))}
              disabled={isLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              🚀 Publish Poll
            </button>
            <button 
              onClick={() => handleAction(() => deleteDraft(poll.id), '/my-polls')}
              disabled={isLoading}
              className="bg-white text-red-600 border border-red-200 px-4 py-2 rounded-md font-medium hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
            >
              🗑️ Delete Draft
            </button>
          </>
        )}

        {poll.status === "open" && (
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => handleAction(() => closePoll(poll.id))}
              disabled={isLoading}
              className="bg-red-600 text-white px-4 py-2 rounded-md font-medium hover:bg-red-700 disabled:opacity-50"
            >
              🛑 Close Polling
            </button>
            <div className="flex bg-gray-50 border border-gray-200 rounded-md overflow-hidden p-1">
              <input 
                type="datetime-local" 
                value={newEndAt} 
                onChange={(e) => setNewEndAt(e.target.value)} 
                className="px-2 py-1 outline-none bg-transparent"
              />
              <button 
                onClick={() => handleAction(() => extendPoll(poll.id, newEndAt))}
                disabled={isLoading || !newEndAt}
                className="bg-white border text-sm font-medium px-3 rounded text-gray-700 hover:bg-gray-50"
              >
                Extend Time
              </button>
            </div>
          </div>
        )}

        {(poll.status === "open" || poll.status === "closed") && (
          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/p/${poll.shareToken}`);
              alert("Copied to clipboard!");
            }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-200 border border-gray-300"
          >
            🔗 Copy Share Link
          </button>
        )}
      </div>
    </div>
  );
}
