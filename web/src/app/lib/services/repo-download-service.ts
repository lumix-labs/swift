"use client";

export interface DownloadedRepository {
  id: string;
  name: string;
  url: string;
  readmeContent?: string;
  readmeCharCount?: number;
}

// Local storage key for downloaded repositories
const DOWNLOADED_REPOS_KEY = 'swift_downloaded_repositories';

// Get downloaded repositories from local storage
export const getDownloadedRepositories = (): DownloadedRepository[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const storedRepos = localStorage.getItem(DOWNLOADED_REPOS_KEY);
    return storedRepos ? JSON.parse(storedRepos) : [];
  } catch (error) {
    console.error('Error loading downloaded repositories:', error);
    return [];
  }
};

// Save downloaded repository to local storage
export const saveDownloadedRepository = (repo: DownloadedRepository): void => {
  try {
    const repos = getDownloadedRepositories();
    const existingIndex = repos.findIndex(r => r.id === repo.id);

    if (existingIndex >= 0) {
      // Update existing repository
      repos[existingIndex] = repo;
    } else {
      // Add new repository
      repos.push(repo);
    }

    localStorage.setItem(DOWNLOADED_REPOS_KEY, JSON.stringify(repos));
  } catch (error) {
    console.error('Error saving downloaded repository:', error);
  }
};

// Download repository (simulated)
export const downloadRepository = async (repoId: string, repoName: string, repoUrl: string): Promise<DownloadedRepository> => {
  // In a real implementation, this would actually download the repo
  // For now, we'll simulate it with a mock README content

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Mock README content with variable length
  const mockReadme = `# ${repoName}\n\nThis is a sample README for the ${repoName} repository.\n\nThe repository URL is ${repoUrl}.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3\n\n## Installation\n\n\`\`\`bash\nnpm install ${repoName.toLowerCase()}\n\`\`\`\n\n## Usage\n\n\`\`\`javascript\nimport { something } from '${repoName.toLowerCase()}';\n\n// Use it somehow\n\`\`\`\n\n## Contributing\n\nContributions are welcome!\n\n## License\n\nMIT`;

  // Calculate character count
  const charCount = mockReadme.length;

  const downloadedRepo: DownloadedRepository = {
    id: repoId,
    name: repoName,
    url: repoUrl,
    readmeContent: mockReadme,
    readmeCharCount: charCount
  };

  // Save to local storage
  saveDownloadedRepository(downloadedRepo);

  return downloadedRepo;
};

// Check if a repository is downloaded
export const isRepositoryDownloaded = (repoId: string): boolean => {
  const repos = getDownloadedRepositories();
  return repos.some(repo => repo.id === repoId);
};

// Get downloaded repository by ID
export const getDownloadedRepository = (repoId: string): DownloadedRepository | undefined => {
  const repos = getDownloadedRepositories();
  return repos.find(repo => repo.id === repoId);
};

