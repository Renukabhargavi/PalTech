import { getAuthUserId } from "@/lib/actions/poll.actions";
import { adminDb } from "@/lib/firebase/admin";
import { redirect } from "next/navigation";
import DashboardHeader from "./dashboard-header";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Hard edge security: if the session cookie is fake or expired, 
  // the Admin SDK will fail to verify the JWT and throw, returning them to sign-in.
  let userId;
  try {
    userId = await getAuthUserId();
  } catch (error) {
    redirect("/sign-in");
  }

  const userDoc = await adminDb.collection("users").doc(userId).get();
  const userData = userDoc.data() || {};
  const userName = userData.name || "User";
  const userEmail = userData.email || "";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DashboardHeader userName={userName} userEmail={userEmail} />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}