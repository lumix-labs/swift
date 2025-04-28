import React from 'react';
import { CommonDropdown } from './CommonDropdown';
import { HeaderActionButton } from './HeaderActionButton';
import { DropdownItem, DropdownProps } from './interfaces';
import { ModalAlert } from './ModalAlert';

export const RepositoriesDropdown: React.FC<DropdownProps> = ({
  show,
  setShow,
  resolvedTheme,
  onSelect,
  selectedId
}) => {
  const [repos, setRepos] = React.useState<DropdownItem[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  // Load repositories from localStorage on component mount
  React.useEffect(() => {
    const savedData = localStorage.getItem('swift-repositories');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed)) {
          setRepos(parsed);
        }
      } catch {
        console.error('Failed to parse repositories from localStorage');
      }
    }
  }, []);

  // Save repositories to localStorage when updated
  React.useEffect(() => {
    localStorage.setItem('swift-repositories', JSON.stringify(repos));
  }, [repos]);

  // Close all other dropdowns when this one is opened
  React.useEffect(() => {
    if (show) {
      // Custom event to signal other dropdowns to close
      const event = new CustomEvent('dropdown-opened', { detail: 'repositories' });
      window.dispatchEvent(event);

      // Listen for other dropdowns opening
      const handleOtherDropdownOpen = (e: CustomEvent) => {
        if (e.detail !== 'repositories') {
          setShow(false);
        }
      };

      window.addEventListener('dropdown-opened', handleOtherDropdownOpen as EventListener);
      return () => {
        window.removeEventListener('dropdown-opened', handleOtherDropdownOpen as EventListener);
      };
    }
  }, [show, setShow]);

  const isValidGithubUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return (parsed.hostname === 'github.com' && 
              parsed.pathname.split('/').filter(Boolean).length >= 2);
    } catch {
      return false;
    }
  };

  const extractRepoName = (url: string): string => {
    try {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        return `${pathParts[0]}/${pathParts[1]}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const handleAddRepo = (values: Record<string, string>) => {
    if (!values.url?.trim()) return;
    
    const url = values.url.trim();
    
    // Validate GitHub URL
    if (!isValidGithubUrl(url)) {
      alert('Please enter a valid GitHub repository URL');
      return;
    }
    
    // Check for duplicates
    if (repos.some(r => r.url?.toLowerCase() === url.toLowerCase())) {
      alert('This repository is already in your list');
      return;
    }
    
    const repoName = extractRepoName(url);
    const newRepo: DropdownItem = {
      id: `repo-${Date.now()}`,
      name: repoName,
      url: url
    };
    
    setRepos(prev => [...prev, newRepo]);
    setIsAddModalOpen(false);
  };
  
  const handleRemove = (id: string) => {
    setRepos(prev => prev.filter(r => r.id !== id));
  };

  const handleSelect = (repo: DropdownItem) => {
    if (onSelect) {
      onSelect(repo);
      setShow(false);
    }
  };
  
  const toggleDropdown = (): void => {
    setShow(!show);
  };
  
  return (
    <>
      <CommonDropdown
        show={show}
        setShow={setShow}
        trigger={
          <HeaderActionButton
            href="#"
            label={<span className="hidden sm:inline">Repositories</span>}
            ariaLabel="Repositories"
            onClick={(e) => {
              e.preventDefault();
              toggleDropdown();
            }}
            icon={<svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.021c0 4.426 2.865 8.18 6.839 9.504.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.338 1.909-1.295 2.748-1.025 2.748-1.025.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.847-2.338 4.695-4.566 4.944.36.31.679.92.679 1.855 0 1.338-.012 2.419-.012 2.749 0 .267.18.578.688.48C19.138 20.197 22 16.446 22 12.021 22 6.484 17.523 2 12 2z"/></svg>}
            className={`p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md transition-colors ${resolvedTheme === 'dark' ? 'bg-white text-black hover:bg-gray-200' : 'bg-black text-white hover:bg-gray-800'}`}
          />
        }
      >
        <div className="flex justify-between items-center px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-semibold text-black dark:text-white">Configured Repositories</h2>
          <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold px-2" onClick={() => setShow(false)} aria-label="Close">&times;</button>
        </div>
        <div className="p-4 pt-2">
          {repos.length === 0 && <div className="text-gray-400 text-sm mb-2">No repositories configured.</div>}
          <ul className="mb-2 max-h-60 overflow-y-auto">
            {repos.map(repo => (
              <li 
                key={repo.id} 
                className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer ${selectedId === repo.id ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                onClick={() => handleSelect(repo)}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{repo.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-52">{repo.url}</span>
                </div>
                <button 
                  className="text-xs text-red-500 hover:text-red-700 ml-2 p-1" 
                  onClick={(event) => { event.stopPropagation(); handleRemove(repo.id); }} 
                  aria-label="Remove"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
          <button 
            className="w-full mt-2 flex items-center justify-center px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded font-medium" 
            onClick={() => { setIsAddModalOpen(true); setShow(false); }}
          >
            + Add New Repository
          </button>
        </div>
      </CommonDropdown>

      <ModalAlert
        open={isAddModalOpen}
        title="Add GitHub Repository"
        message="Enter the URL of a GitHub repository"
        fields={[
          { name: 'url', label: 'Repository URL', type: 'url', required: true, placeholder: 'https://github.com/username/repo' },
        ]}
        onSubmit={handleAddRepo}
        onCancel={() => setIsAddModalOpen(false)}
        submitLabel="Add Repository"
      />
    </>
  );
};
