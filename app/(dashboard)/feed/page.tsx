import { adminDb } from "@/lib/firebase/admin";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ArrowDownAZ, ArrowUpAZ, Clock, Filter, Users, Vote } from "lucide-react";

type FeedStatus = "all" | "open" | "closed";
type FeedSort = "createdAt" | "endAt" | "totalRespondents";
type FeedOrder = "asc" | "desc";

async function getPublicFeed(status: FeedStatus, sortBy: FeedSort, order: FeedOrder, page: number) {
  const pageSize = 20;
  const snapshot = await adminDb.collection("polls").where("visibility", "==", "public").get();

  const polls = snapshot.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        creatorName: data.creatorName || "Anonymous",
        totalRespondents: data.totalRespondents || 0,
        createdAt: data.createdAt?.toDate() || null,
        endAt: data.endAt?.toDate() || null,
        status: data.status as "draft" | "open" | "closed",
      };
    })
    .filter((poll) => poll.status !== "draft")
    .filter((poll) => status === "all" ? true : poll.status === status)
    .sort((a, b) => {
      const aValue =
        sortBy === "totalRespondents"
          ? a.totalRespondents
          : sortBy === "endAt"
            ? a.endAt?.getTime() || 0
            : a.createdAt?.getTime() || 0;
      const bValue =
        sortBy === "totalRespondents"
          ? b.totalRespondents
          : sortBy === "endAt"
            ? b.endAt?.getTime() || 0
            : b.createdAt?.getTime() || 0;

      return order === "asc" ? aValue - bValue : bValue - aValue;
    });

  const totalPages = Math.max(1, Math.ceil(polls.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    polls: polls.slice(start, start + pageSize),
    currentPage: safePage,
    totalPages,
    totalCount: polls.length,
  };
}

function buildFeedHref(status: FeedStatus, sortBy: FeedSort, order: FeedOrder, page: number) {
  const params = new URLSearchParams({
    status,
    sort: sortBy,
    order,
    page: String(page),
  });

  return `/feed?${params.toString()}`;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: FeedStatus; sort?: FeedSort; order?: FeedOrder; page?: string }>;
}) {
  const params = await searchParams;
  const status: FeedStatus = params.status === "open" || params.status === "closed" ? params.status : "all";
  const sortBy: FeedSort =
    params.sort === "endAt" || params.sort === "totalRespondents" ? params.sort : "createdAt";
  const order: FeedOrder = params.order === "asc" ? "asc" : "desc";
  const page = Number(params.page || "1");

  const { polls, currentPage, totalPages, totalCount } = await getPublicFeed(status, sortBy, order, page);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Public Feed</h1>
        <p className="text-gray-500">Browse public polls you are allowed to discover and vote on.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Status</label>
            <div className="flex gap-2">
              {(["all", "open", "closed"] as FeedStatus[]).map((value) => (
                <Link
                  key={value}
                  href={buildFeedHref(value, sortBy, order, 1)}
                  className={`px-3 py-2 rounded-md text-sm border ${
                    status === value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {value === "all" ? "All" : value[0].toUpperCase() + value.slice(1)}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 block mb-1">Sort By</label>
            <div className="flex gap-2 flex-wrap">
              {([
                ["createdAt", "Created"],
                ["endAt", "Expiry"],
                ["totalRespondents", "Votes"],
              ] as [FeedSort, string][]).map(([value, label]) => (
                <Link
                  key={value}
                  href={buildFeedHref(status, value, order, 1)}
                  className={`px-3 py-2 rounded-md text-sm border ${
                    sortBy === value
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-gray-500 inline-flex items-center gap-2">
            <Filter size={16} />
            {totalCount} poll{totalCount === 1 ? "" : "s"}
          </div>
          <Link
            href={buildFeedHref(status, sortBy, order === "asc" ? "desc" : "asc", 1)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
          >
            {order === "asc" ? <ArrowUpAZ size={16} /> : <ArrowDownAZ size={16} />}
            {order === "asc" ? "Ascending" : "Descending"}
          </Link>
        </div>
      </div>

      {polls.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-xl border border-gray-200">
          <Vote size={32} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No public polls match this view</h3>
          <p className="text-gray-500 mt-1">Try changing the filters or create a new public poll.</p>
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
                    poll.status === "open" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
                <div className="text-xs text-gray-400 mt-2 font-medium">By {poll.creatorName}</div>
              </div>

              <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
                <div className="flex items-center text-xs text-gray-500 font-medium">
                  <Users size={14} className="mr-1.5" />
                  <span className="text-gray-700 font-semibold mr-1">{poll.totalRespondents}</span> votes
                </div>
                <div className="flex items-center text-xs text-gray-400">
                  <Clock size={12} className="mr-1" />
                  {poll.createdAt && formatDistanceToNow(poll.createdAt, { addSuffix: true })}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 pt-4">
          <Link
            href={buildFeedHref(status, sortBy, order, Math.max(1, currentPage - 1))}
            className={`px-4 py-2 rounded-md border text-sm ${
              currentPage === 1
                ? "pointer-events-none border-gray-100 text-gray-300"
                : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            Previous
          </Link>
          <span className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </span>
          <Link
            href={buildFeedHref(status, sortBy, order, Math.min(totalPages, currentPage + 1))}
            className={`px-4 py-2 rounded-md border text-sm ${
              currentPage === totalPages
                ? "pointer-events-none border-gray-100 text-gray-300"
                : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
