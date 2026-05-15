export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center items-center gap-2 mt-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-md">P</div>
            <h2 className="text-center text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
              Pollaris
            </h2>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
