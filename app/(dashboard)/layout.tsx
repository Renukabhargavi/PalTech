"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      toast.success("Signed out successfully");
      router.push("/sign-in");
      router.refresh();
    } catch (e) {
      toast.error("Error signing out");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-extrabold tracking-tight text-blue-600">Pollaris</h1>
            <nav className="hidden md:flex gap-6 border-l border-gray-200 pl-6">
               <Link href="/feed" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Public Feed</Link>
               <Link href="/my-polls" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">My Polls</Link>
               <Link href="/shared" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Shared with me</Link>
            </nav>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}