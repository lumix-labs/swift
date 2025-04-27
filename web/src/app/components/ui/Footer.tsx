export function Footer() {
  return (
    <footer className="w-full py-4 px-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-4">
          {/* Terms and Copyright */}
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
            
            <div className="mt-2 sm:mt-0 flex items-center space-x-3">
              <a 
                href="https://x.com/ashwani_48" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center hover:text-black dark:hover:text-white transition-colors"
                aria-label="Follow on Twitter"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                </svg>
              </a>
              &copy; {new Date().getFullYear()} Lumix Labs. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
