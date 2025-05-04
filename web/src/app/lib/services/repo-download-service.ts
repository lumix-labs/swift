"use client";

export enum RepositoryStatus {
  PENDING = "pending", // Initial state, not yet processed
  QUEUED = "queued", // In download queue
  DOWNLOADING = "downloading", // Actively downloading
  DOWNLOADED = "downloaded", // Download completed but not yet ingested
  INGESTING = "ingesting", // Processing/ingesting the repository
  INGESTED = "ingested", // Ingestion completed
  READY = "ready", // Ready to use (combination of downloaded and ingested)
}

export interface DownloadedRepository {
  id: string;
  name: string;
  url: string;
  readmeContent?: string;
  status: RepositoryStatus;
  downloadDate?: number;
  repoTree?: string; // Added to store repository tree for context
}

// Local storage key for downloaded repositories
const DOWNLOADED_REPOS_KEY = "swift_downloaded_repositories";

// Get downloaded repositories from local storage
export const getDownloadedRepositories = (): DownloadedRepository[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedRepos = localStorage.getItem(DOWNLOADED_REPOS_KEY);
    return storedRepos ? JSON.parse(storedRepos) : [];
  } catch (error) {
    console.error("Error loading downloaded repositories:", error);
    return [];
  }
};

// Save downloaded repository to local storage
export const saveDownloadedRepository = (repo: DownloadedRepository): void => {
  try {
    const repos = getDownloadedRepositories();
    const existingIndex = repos.findIndex((r) => r.id === repo.id);

    if (existingIndex >= 0) {
      // Update existing repository
      repos[existingIndex] = repo;
    } else {
      // Add new repository
      repos.push(repo);
    }

    localStorage.setItem(DOWNLOADED_REPOS_KEY, JSON.stringify(repos));
  } catch (error) {
    console.error("Error saving downloaded repository:", error);
  }
};

// Queue repository for download
export const queueRepositoryForDownload = (repoId: string, repoName: string, repoUrl: string): DownloadedRepository => {
  const queuedRepo: DownloadedRepository = {
    id: repoId,
    name: repoName,
    url: repoUrl,
    status: RepositoryStatus.QUEUED,
  };

  // Save the queued state to local storage
  saveDownloadedRepository(queuedRepo);
  return queuedRepo;
};

// Download repository (simulated)
export const downloadRepository = async (
  repoId: string,
  repoName: string,
  repoUrl: string,
): Promise<DownloadedRepository> => {
  // First update the repository status to downloading
  const updatingRepo: DownloadedRepository = {
    id: repoId,
    name: repoName,
    url: repoUrl,
    status: RepositoryStatus.DOWNLOADING,
  };

  // Save the downloading state
  saveDownloadedRepository(updatingRepo);

  // In a real implementation, this would actually download the repo
  // For now, we'll simulate it with a mock README content

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mock README content
  const mockReadme = `# ${repoName}\n\nThis is a sample README for the ${repoName} repository.\n\nThe repository URL is ${repoUrl}.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3\n\n## Installation\n\n\`\`\`bash\nnpm install ${repoName.toLowerCase()}\n\`\`\`\n\n## Usage\n\n\`\`\`javascript\nimport { something } from '${repoName.toLowerCase()}';\n\n// Use it somehow\n\`\`\`\n\n## Contributing\n\nContributions are welcome!\n\n## License\n\nMIT`;

  // Update status to DOWNLOADED
  const downloadedRepo: DownloadedRepository = {
    id: repoId,
    name: repoName,
    url: repoUrl,
    readmeContent: mockReadme,
    status: RepositoryStatus.DOWNLOADED,
    downloadDate: Date.now(),
  };

  // Save to local storage
  saveDownloadedRepository(downloadedRepo);
  
  // Now start the ingestion process
  return startIngestion(downloadedRepo);
};

// Ingest repository data (simulated)
export const startIngestion = async (repo: DownloadedRepository): Promise<DownloadedRepository> => {
  // Update status to INGESTING
  const ingestingRepo: DownloadedRepository = {
    ...repo,
    status: RepositoryStatus.INGESTING,
  };
  
  // Save the ingesting state
  saveDownloadedRepository(ingestingRepo);
  
  // Simulate ingestion delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Generate a mock repository tree (respecting .gitignore)
  const mockRepoTree = generateMockRepoTree(repo.name);
  
  // Update status to INGESTED and set as READY
  const ingestedRepo: DownloadedRepository = {
    ...ingestingRepo,
    status: RepositoryStatus.INGESTED,
    repoTree: mockRepoTree,
  };
  
  // Save to local storage
  saveDownloadedRepository(ingestedRepo);
  
  return ingestedRepo;
};

// Generate a mock repository tree
const generateMockRepoTree = (repoName: string): string => {
  // This would be generated from the actual repo in a real implementation
  // respecting .gitignore patterns
  return `
  ${repoName}/
  ├── src/
  │   ├── components/
  │   │   ├── Button.tsx
  │   │   ├── Header.tsx
  │   │   └── Footer.tsx
  │   ├── pages/
  │   │   ├── index.tsx
  │   │   ├── about.tsx
  │   │   └── contact.tsx
  │   ├── utils/
  │   │   ├── api.ts
  │   │   └── helpers.ts
  │   └── index.ts
  ├── public/
  │   ├── images/
  │   └── favicon.ico
  ├── package.json
  ├── tsconfig.json
  ├── README.md
  └── .gitignore
  `;
};

// Check if a repository is downloaded and ready
export const isRepositoryReady = (repoId: string): boolean => {
  const repos = getDownloadedRepositories();
  const repo = repos.find((repo) => repo.id === repoId);
  return repo !== undefined && (repo.status === RepositoryStatus.READY || repo.status === RepositoryStatus.INGESTED);
};

// Get downloaded repository by ID
export const getDownloadedRepository = (repoId: string): DownloadedRepository | undefined => {
  const repos = getDownloadedRepositories();
  return repos.find((repo) => repo.id === repoId);
};

// Update repository status
export const updateRepositoryStatus = (repoId: string, status: RepositoryStatus): DownloadedRepository | undefined => {
  const repos = getDownloadedRepositories();
  const repoIndex = repos.findIndex((repo) => repo.id === repoId);

  if (repoIndex >= 0) {
    repos[repoIndex].status = status;
    if (status === RepositoryStatus.READY || status === RepositoryStatus.INGESTED) {
      repos[repoIndex].downloadDate = Date.now();
    }

    // Save updated repos to local storage
    localStorage.setItem(DOWNLOADED_REPOS_KEY, JSON.stringify(repos));
    return repos[repoIndex];
  }

  return undefined;
};

// Get repository status
export const getRepositoryStatus = (repoId: string): RepositoryStatus => {
  const repo = getDownloadedRepository(repoId);
  return repo?.status || RepositoryStatus.PENDING;
};

// Check if repository is ready for chat based on status
export const isRepositoryReadyForChat = (status: RepositoryStatus | null): boolean => {
  return status === RepositoryStatus.READY || status === RepositoryStatus.INGESTED;
};
