import PollForm from "@/components/polls/poll-form";
import { getRecentPollTemplates } from "@/lib/actions/poll.actions";

export default async function CreatePollPage() {
  const recentPolls = await getRecentPollTemplates(6);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create a New Poll</h1>
        <p className="text-gray-500 mt-1">Start by drafting your question and options. It will be saved as a draft secretly until you publish.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <PollForm recentPolls={recentPolls} />
      </div>
    </div>
  );
}
