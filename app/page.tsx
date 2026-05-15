import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="w-full bg-white shadow-sm py-4 px-6 md:px-12 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-md flex items-center justify-center text-white font-bold text-xl">P</div>
          <span className="text-2xl font-bold text-blue-900 tracking-tight">PalTech</span>
        </div>
        <div className="space-x-4">
          <Link href="/sign-in" className="text-gray-600 hover:text-blue-700 font-medium">Log in</Link>
          <Link href="/sign-up" className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-md font-medium transition-colors shadow-sm">Get Started</Link>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center px-6 py-20 pb-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
            Empower Your Decisions with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-teal-500">PalTech Polling</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            The enterprise-grade feedback engine designed specifically for PalTech agile teams. Create polls, gather insights, and drive data-backed decisions effortlessly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/sign-up" className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all">
              Create a Free Account
            </Link>
            <Link href="/sign-in" className="bg-white border-2 border-slate-200 text-slate-700 hover:border-blue-700 hover:text-blue-700 px-8 py-4 rounded-lg font-bold text-lg shadow-sm hover:shadow transition-all">
              Sign In to Dashboard
            </Link>
          </div>
        </div>
        
        <div className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center text-2xl mb-6 font-bold shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Instant Polling</h3>
            <p className="text-slate-600 leading-relaxed">Spin up a new poll and share it across the PalTech network instantly. Get live results as the entire team votes.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center text-2xl mb-6 font-bold shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Secure & Private</h3>
            <p className="text-slate-600 leading-relaxed">Enterprise-grade security ensures your data stays within the intended audience. Robust authentication standard.</p>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center text-2xl mb-6 font-bold shadow-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Data-Driven Insights</h3>
            <p className="text-slate-600 leading-relaxed">Analyze feedback with clear, actionable metrics to improve workflows, features, and overall company decisions.</p>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 py-12 text-center text-slate-400">
        <p>&copy; {new Date().getFullYear()} PalTech Enterprises. All rights reserved.</p>
      </footer>
    </div>
  );
}
