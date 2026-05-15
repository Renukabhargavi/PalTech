import { getAuthUserId } from "@/lib/actions/poll.actions";
import { redirect } from "next/navigation";
import DashboardHeader from "./dashboard-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Hard edge security: if the session cookie is fake or expired, 
  // the Admin SDK will fail to verify the JWT and throw, returning them to sign-in.
  try {
    await getAuthUserId();
  } catch (error) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DashboardHeader />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}