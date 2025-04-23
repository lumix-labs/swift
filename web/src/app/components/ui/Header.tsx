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
            <h1 className="font-semibold text-lg">Swift</h1>
          </div>
        </Link>
      </div>
      
      <div className="flex items-center space-x-4">
        <RepoConnector onConnect={handleConnectRepo} />
        <ModelSelector onSelectModel={handleSelectModel} />
        
        <button
          onClick={handleNewChat}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
          aria-label="New Chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">New Chat</span>
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
