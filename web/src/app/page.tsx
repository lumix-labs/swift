import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8 bg-white dark:bg-black">
      <main className="flex flex-col items-center justify-center w-full max-w-4xl text-center space-y-10">
        <div className="relative w-20 h-20 mb-2">
          <Image 
            src="/swift-logo.svg" 
            alt="Swift Logo" 
            width={80}
            height={80}
            className="dark:invert"
            priority
          />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
          Swift
        </h1>
        
        <p className="text-xl md:text-2xl max-w-2xl">
          Talk to code directly. Skip the hierarchy.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          <div className="flex flex-col items-center p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <Image 
              src="/file.svg"
              alt="Code icon"
              width={40}
              height={40}
              className="mb-4 dark:invert"
            />
            <h2 className="text-xl font-semibold mb-2">Services Understanding</h2>
            <p className="text-gray-700 dark:text-gray-300">Ask questions about product and features.</p>
          </div>
          
          <div className="flex flex-col items-center p-6 border border-gray-200 dark:border-gray-800 rounded-lg">
            <Image 
              src="/window.svg"
              alt="Terminal icon"
              width={40}
              height={40}
              className="mb-4 dark:invert"
            />
            <h2 className="text-xl font-semibold mb-2">AI-Powered</h2>
            <p className="text-gray-700 dark:text-gray-300">Leverages AI to understand beyond code.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md">
          <a 
            href="https://x.com/ashwani_48" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 border border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-medium rounded-md hover:opacity-90 transition-opacity text-center"
          >
            Contact us
          </a>
          <a 
            href="https://github.com/lumix-labs/swift" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 border border-black dark:border-white text-black dark:text-white font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-center"
          >
            View on GitHub
          </a>
        </div>
      </main>
      
      <footer className="mt-20 w-full text-center text-sm text-gray-600 dark:text-gray-400">
        <p>&copy; {new Date().getFullYear()} Lumix Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
