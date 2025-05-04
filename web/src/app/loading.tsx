export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 animate-pulse">
          <span className="text-6xl animate-pulse select-none" role="img" aria-label="Swift Logo">
            ⚡
          </span>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
