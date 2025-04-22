export function Footer() {
  return (
    <footer className="w-full py-4 px-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            By messaging Swift, you agree to our{' '}
            <a 
              href="#" 
              className="underline hover:text-black dark:hover:text-white transition-colors"
            >
              Terms
            </a>{' '}
            and have read our{' '}
            <a 
              href="#" 
              className="underline hover:text-black dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
          </p>
          
          <div className="mt-2 sm:mt-0">
            &copy; {new Date().getFullYear()} Lumix Labs. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
