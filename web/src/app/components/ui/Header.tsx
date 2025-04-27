"use client"

import { useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { useChat } from '../../context/ChatContext';
import { ModelSelector } from './ModelSelector';
import { RepoConnector } from './RepoConnector';
import { repoService } from '../../lib/services/repo-service';
import Image from 'next/image';
import Link from 'next/link';

export function Header() {
  const { createNewSession, sessions, currentSessionId, switchSession, deleteSession, setSelectedModel } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectedRepos, setConnectedRepos] = useState<string[]>([]);

  useEffect(() => {
    // Load connected repositories on component mount
    const repos = repoService.getConnectedRepositories();
    setConnectedRepos(repos);
  }, []);

  const handleNewChat = () => {
    createNewSession();
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const handleConnectRepo = async (repoUrl: string) => {
    const result = await repoService.connectRepository(repoUrl);
    if (result.success) {
      setConnectedRepos(repoService.getConnectedRepositories());
    } else {
      throw new Error(result.message);
    }
  };

  const handleDisconnectRepo = (repoUrl: string) => {
    if (repoService.disconnectRepository(repoUrl)) {
      setConnectedRepos(repos => repos.filter(repo => repo !== repoUrl));
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          aria-label="Toggle chat sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </button>

        <Link href="/" onClick={() => window.location.reload()}>
          <div className="flex items-center space-x-2 cursor-pointer">
            <Image src="/swift-logo.svg" alt="Swift Logo" width={32} height={32} />
            <div>
              <h1 className="font-semibold text-lg">Swift</h1>
              <p className="text-xs font-medium leading-tight -mt-1">by Lumix Labs</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        {/* Book a Demo - Icon on small screens, text + icon on larger screens */}
        <a
          href="https://calendly.com/karoriwal/swift"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 sm:px-3 sm:py-1.5 text-sm bg-black text-white dark:bg-white dark:text-black rounded-md font-medium 
                   hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          aria-label="Book a Demo"
        >
          <span className="hidden sm:inline">Book a Demo</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        </a>
        <a
          href="https://docs.google.com/presentation/d/1i3VbI0HzMQcodzJs8n_66absswe0SxkKM0BaPPBFJHA/edit?usp=sharing"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 sm:px-3 sm:py-1.5 text-sm bg-gray-800 text-white dark:bg-gray-100 dark:text-black rounded-md font-medium hover:bg-gray-900 dark:hover:bg-gray-200 transition-colors flex items-center space-x-1"
          aria-label="Investors Pitch Deck"
        >
          <span className="hidden sm:inline">Investors Pitch Deck</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m4 0h1v4h1M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </a>

        {/* Repository connector - icon only on small screens */}
        <div className="hidden sm:block">
          <RepoConnector onConnect={handleConnectRepo} />
        </div>
        <button
          onClick={() => {
            const repoConnector = document.querySelector('[aria-label="Connect Repository"]');
            if (repoConnector instanceof HTMLElement) {
              repoConnector.click();
            }
          }}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none sm:hidden"
          aria-label="Connect Repository"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414a1 1 0 00-.293-.707l-3.414-3.414A1 1 0 0011.586 3H3zm9.5 2V5a.5.5 0 01.5.5v4a.5.5 0 01-.5.5h-4a.5.5 0 01-.5-.5v-4a.5.5 0 01.5-.5h3zm-3-1a.5.5 0 00-.5.5v4a.5.5 0 00.5.5h4a.5.5 0 00.5-.5v-4a.5.5 0 00-.5-.5h-4z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Model selector - icon only on small screens */}
        <div className="hidden sm:block">
          <ModelSelector onSelectModel={handleSelectModel} />
        </div>
        <button
          onClick={() => {
            const modelSelector = document.querySelector('[aria-label="Select Model"]');
            if (modelSelector instanceof HTMLElement) {
              modelSelector.click();
            }
          }}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none sm:hidden"
          aria-label="Select Model"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
            <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
            <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
          </svg>
        </button>

        {/* New chat button - icon only on small screens */}
        <button
          onClick={handleNewChat}
          className="p-2 sm:flex sm:items-center sm:space-x-1 sm:px-3 sm:py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          aria-label="New Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline text-sm font-medium">New Chat</span>
        </button>

        <ThemeToggle />
      </div>

      {/* Sidebar for Chat History and Repositories */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          ></div>

          {/* Sidebar */}
          <div className="relative flex flex-col w-64 max-w-xs bg-white dark:bg-gray-900 h-full overflow-y-auto">
            {/* Tab navigation */}
            <div className="flex border-b border-gray-200 dark:border-gray-800">
              <button
                className="flex-1 py-3 font-medium text-center border-b-2 border-black dark:border-white"
              >
                Chat History
              </button>
              <button
                className="flex-1 py-3 font-medium text-center text-gray-500 dark:text-gray-400"
              >
                Repositories
              </button>
            </div>

            {/* Chat History Panel */}
            <div className="flex-1 p-2 overflow-y-auto">
              {sessions.length > 0 ? (
                <div className="space-y-1">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`
                        flex justify-between items-center p-2 rounded-md cursor-pointer
                        ${currentSessionId === session.id ? 'bg-gray-100 dark:bg-gray-800' : ''}
                        hover:bg-gray-100 dark:hover:bg-gray-800
                      `}
                      onClick={() => switchSession(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(session.updatedAt)}</p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full"
                        aria-label="Delete chat"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 p-2">No previous chats</p>
              )}
            </div>

            {/* Repositories Panel (hidden initially) */}
            <div className="hidden flex-1 p-2 overflow-y-auto">
              {connectedRepos.length > 0 ? (
                <div className="space-y-1">
                  {connectedRepos.map((repo) => (
                    <div
                      key={repo}
                      className="flex justify-between items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{repo.split('/').pop()?.replace('.git', '')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{repo}</p>
                      </div>

                      <button
                        onClick={() => handleDisconnectRepo(repo)}
                        className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full"
                        aria-label="Disconnect repository"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No connected repositories</p>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="px-3 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
                  >
                    Connect Repository
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
