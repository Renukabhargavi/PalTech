"use client";

import { useState, useEffect } from "react";
import { castVote, withdrawVote } from "@/lib/actions/vote.actions";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

import ExportCsvButton from "@/components/polls/export-csv-button";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];

export default function VotingClientUI({ poll: initialPoll, initialMyVote, userId }: { poll: any, initialMyVote: string[] | null, userId: string }) {
  const router = useRouter();
  
  // Realtime state
  const [poll, setPoll] = useState(initialPoll);
  const [currentVote, setCurrentVote] = useState<string[] | null>(initialMyVote);
  const [selected, setSelected] = useState<string[]>(initialMyVote || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Realtime updates
  useEffect(() => {
    if (!initialPoll?.id) return;
    const unsubscribe = onSnapshot(doc(db, "polls", initialPoll.id), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPoll((prev: any) => ({
          ...prev,
          ...data,
          options: data.options || prev.options,
          totalRespondents: data.totalRespondents || 0,
          status: data.status || prev.status,
          endAt: data.endAt?.toDate?.()?.toISOString() || prev.endAt
        }));
      }
    }, (err) => {
      console.error("Failed to listen for poll updates:", err);
    });

    return () => unsubscribe();
  }, [initialPoll?.id]);

  const isClosed = poll.status === "closed";
  const hasVoted = currentVote !== null;
  
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
      setCurrentVote([...selected]);
      router.refresh(); 
    } catch (e: any) {
      setError(e.message || "Failed to vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawVote = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await withdrawVote(poll.id);
      setCurrentVote(null);
      setSelected([]);
      router.refresh();
    } catch (e: any) {
      setError(e.message || "Failed to withdraw vote");
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = [...poll.options].sort((a: any, b: any) => a.order - b.order);

  // Chart Data preparation
  const chartData = options.map((opt: any) => ({
    name: opt.label,
    value: opt.voteCount,
  })).filter(opt => opt.value > 0);

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
              {canSeeResults && poll.type === "multi" && (
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

      {canSeeResults && poll.type === "single" && chartData.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Results Distribution</h3>
          <div className="w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1000}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} votes`, 'Count']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {canSeeResults && poll.type === "multi" && chartData.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4 text-center">Results Distribution</h3>
          <p className="text-sm text-gray-500 text-center mb-4">
            Multi-choice percentages are calculated against total respondents, so they may add up to more than 100%.
          </p>
          <div className="w-full min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  formatter={(value: any) => [`${value} votes`, 'Count']}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
          <div className="flex items-center gap-3">
            {hasVoted && (
              <button
                onClick={handleWithdrawVote}
                disabled={isSubmitting}
                className="bg-white text-gray-700 border border-gray-300 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw Vote
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || selected.length === 0 || (hasVoted && [...(currentVote || [])].sort().join(',') === [...selected].sort().join(','))}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : hasVoted ? "Update Vote" : "Cast Vote"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
