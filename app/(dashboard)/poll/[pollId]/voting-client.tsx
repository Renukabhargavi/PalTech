"use client";

import { useState } from "react";
import { castVote } from "@/lib/actions/vote.actions";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import ExportCsvButton from "@/components/polls/export-csv-button";

export default function VotingClientUI({ poll, initialMyVote, userId }: { poll: any, initialMyVote: string[] | null, userId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialMyVote || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isClosed = poll.status === "closed";
  const hasVoted = initialMyVote !== null;
  
  // FR34: "Always visible" -> anyone can see. 
  // FR35: "Visible after voting" -> only viewers who voted (or creator) can see while open.
  // FR36: Once Closed, results are visible to all viewers.
  const canSeeResults = 
    isClosed || 
    poll.resultsVisibility === "always" ||
    (poll.resultsVisibility === "after_voting" && hasVoted) ||
    poll.creatorId === userId;

  const totalVotes = poll.totalRespondents;

  const handleToggle = (id: string) => {
    if (isClosed) return;
    if (poll.type === "single") {
      setSelected([id]);
    } else {
      setSelected(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    }
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await castVote(poll.id, selected);
      router.refresh(); // Refresh server props
    } catch (e: any) {
      setError(e.message || "Failed to vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort options by order
  const options = [...poll.options].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {error && <div className="text-red-500 bg-red-50 border border-red-200 rounded p-3 text-sm">{error}</div>}
      
      <div className="space-y-3">
        {options.map((opt: any) => {
          const isSelected = selected.includes(opt.id);
          const percentage = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
          
          return (
            <div 
              key={opt.id}
              onClick={() => handleToggle(opt.id)}
              className={`relative border-2 rounded-xl p-4 transition-all duration-200 overflow-hidden cursor-pointer ${
                isSelected 
                  ? "border-blue-600 bg-blue-50" 
                  : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 bg-white"
              } ${isClosed ? "cursor-default opacity-90 hover:border-gray-200 hover:bg-white" : ""}`}
            >
              {canSeeResults && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-blue-100 opacity-50 z-0 transition-all duration-1000 ease-out" 
                  style={{ width: `${percentage}%` }} 
                />
              )}
              
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 flex items-center justify-center rounded border ${
                    poll.type === "single" ? "rounded-full" : "rounded-md"
                  } ${
                    isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"
                  }`}>
                    {isSelected && <div className={`w-2.5 h-2.5 bg-white ${poll.type === "single" ? "rounded-full" : "rounded-sm"}`} />}
                  </div>
                  <span className={`text-lg ${isSelected ? "text-blue-900 font-semibold" : "text-gray-700 font-medium"}`}>
                    {opt.label}
                  </span>
                </div>

                {canSeeResults && (
                  <div className="text-right">
                    <span className="font-bold text-gray-900 block">{percentage}%</span>
                    <span className="text-xs text-gray-500 block">{opt.voteCount} votes</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-6 border-t border-gray-100 flex justify-between items-center flex-wrap gap-4">
        <div className="text-gray-500 text-sm flex items-center gap-4">
          {!canSeeResults && !hasVoted ? (
            <span className="text-amber-600 font-medium">Vote to see results</span>
          ) : (
            <div className="flex items-center gap-3">
              <span>{totalVotes} total {totalVotes === 1 ? "vote" : "votes"} cast</span>
              <ExportCsvButton pollTitle={poll.title} options={poll.options} totalRespondents={totalVotes} />
            </div>
          )}
          {hasVoted && <span className="ml-2 inline-flex items-center text-blue-600 font-medium"><CheckCircle2 size={16} className="mr-1"/> You have voted</span>}
        </div>

        {!isClosed && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || selected.length === 0 || (hasVoted && [...(initialMyVote || [])].sort().join(',') === [...selected].sort().join(','))}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : hasVoted ? "Update Vote" : "Cast Vote"}
          </button>
        )}
      </div>
    </div>
  );
}
