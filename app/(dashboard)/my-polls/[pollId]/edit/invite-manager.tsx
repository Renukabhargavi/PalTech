"use client";

import { useState } from "react";
import { inviteUserByEmail, revokeInvite } from "@/lib/actions/invite.actions";
import { useRouter } from "next/navigation";

export default function InviteManager({ pollId, existingInvites = [] }: { pollId: string, existingInvites?: any[] }) {
  const router = useRouter();
  const [inputVal, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    
    setIsLoading(true);
    setMessage(null);
    try {
      const emails = inputVal.split(',').map(e => e.trim()).filter(Boolean);
      let successCount = 0;
      let errorCount = 0;
      
      for (const email of emails) {
        try {
          await inviteUserByEmail(pollId, email);
          successCount++;
        } catch (err: any) {
          if (err.message !== "User is already invited") {
             errorCount++;
          }
        }
      }
      
      if (successCount > 0) {
        setMessage({ type: "success", text: `Successfully invited ${successCount} user(s).${errorCount > 0 ? ` Failed to invite ${errorCount}.` : ''}` });
        setInputVal("");
        router.refresh();
      } else {
        setMessage({ type: "error", text: "Failed to invite users. Ensure they are registered." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to invite" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;
    
    setIsLoading(true);
    setMessage(null);
    try {
      await revokeInvite(pollId, userId);
      setMessage({ type: "success", text: "Invitation revoked." });
      router.refresh();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to revoke" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-4 mt-6">
      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Invite Participants</h3>
      
      {message && (
        <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleInvite} className="flex gap-2">
        <input 
          type="text" 
          placeholder="user@example.com, another@example.com" 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button 
          type="submit" 
          disabled={isLoading || !inputVal.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Invite
        </button>
      </form>

      {existingInvites.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Invited Users ({existingInvites.length})</h4>
          <div className="space-y-2">
            {existingInvites.map((invite) => (
              <div key={invite.id} className="flex justify-between items-center bg-gray-50 p-2 px-3 rounded-md border border-gray-100">
                <div>
                  <div className="font-medium text-sm text-gray-900">{invite.userName || "Unknown"}</div>
                  <div className="text-xs text-gray-500">{invite.userEmail}</div>
                </div>
                <button 
                  onClick={() => handleRevoke(invite.id)}
                  disabled={isLoading}
                  className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 bg-white border border-red-200 rounded disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
