import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <header className="w-full bg-white shadow-sm py-4 px-6 md:px-12 flex justify-start items-center z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-700 rounded-md flex items-center justify-center text-white font-bold text-xl">P</div>
          <span className="text-2xl font-bold text-blue-900 tracking-tight">PalTech</span>
        </Link>
      </header>
      
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-slate-100">
          <div>
            <div className="flex justify-center items-center gap-2 mt-2">
              <h2 className="text-center text-3xl font-extrabold tracking-tight text-slate-900">
                Welcome to <span className="text-blue-700">Pollaris</span>
              </h2>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
