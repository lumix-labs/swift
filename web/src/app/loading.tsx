import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center justify-center">
        <div className="relative w-16 h-16 animate-pulse">
          <Image 
            src="/swift-logo.svg" 
            alt="Swift Logo" 
            width={64}
            height={64}
            className="dark:invert"
          />
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
