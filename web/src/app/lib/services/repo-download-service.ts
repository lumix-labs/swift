"use client";

import JSZip from "jszip";

export enum RepositoryStatus {
  PENDING = "pending", // Initial state, not yet processed
  QUEUED = "queued", // In download queue
  DOWNLOADING = "downloading", // Actively downloading
  DOWNLOADED = "downloaded", // Download completed but not yet ingested
  INGESTING = "ingesting", // Processing/ingesting the repository
  INGESTED = "ingested", // Ingestion completed
  READY = "ready", // Ready to use (combination of downloaded and ingested)
  ERROR = "error", // Error occurred during download or ingestion
}

export interface DownloadedRepository {
  id: string;
  name: string;
  url: string;
  readmeContent?: string;
  status: RepositoryStatus;
  downloadDate?: number;
  repoTree?: string; // Added to store repository tree for context
  error?: string; // Error message if download or ingestion failed
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

// Helper function to extract owner and repo from GitHub URL
const extractGitHubInfo = (repoUrl: string): { owner: string; repo: string } | null => {
  // Normalize URL by removing .git suffix and trailing slashes
  const normalizedUrl = repoUrl.replace(/\.git$/, "").replace(/\/$/, "");

  // GitHub URL patterns to match
  const githubPatterns = [
    /github\.com\/([^\/]+)\/([^\/]+)$/, // https://github.com/owner/repo
    /github\.com:([^\/]+)\/([^\/]+)$/, // git@github.com:owner/repo
  ];

  for (const pattern of githubPatterns) {
    const match = normalizedUrl.match(pattern);
    if (match && match.length === 3) {
      return {
        owner: match[1],
        repo: match[2],
      };
    }
  }

  return null;
};

// Download repository from GitHub via proxy API
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

  try {
    // Extract GitHub owner and repo name
    const githubInfo = extractGitHubInfo(repoUrl);
    if (!githubInfo) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const { owner, repo } = githubInfo;

    // Try to download using our proxy API
    // This avoids CORS issues by proxying the request through our server
    let proxyUrl = `/api/proxy/github?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=main`;
    let zipResponse = await fetch(proxyUrl);

    if (!zipResponse.ok) {
      // If the request failed for any reason other than just branch not found,
      // throw an error with the appropriate message
      if (zipResponse.status !== 404) {
        const errorData = await zipResponse.json();
        throw new Error(errorData.error || `Failed to download repository: ${zipResponse.statusText}`);
      }

      // If we reached here, it was a 404 and we'll try the master branch through the proxy
      proxyUrl = `/api/proxy/github?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=master`;
      zipResponse = await fetch(proxyUrl);

      if (!zipResponse.ok) {
        const errorData = await zipResponse.json();
        throw new Error(errorData.error || `Failed to download repository: ${zipResponse.statusText}`);
      }
    }

    console.log(`Successfully downloading repository from: ${proxyUrl}`);

    // Get the ZIP content as ArrayBuffer
    const zipData = await zipResponse.arrayBuffer();

    // Update status to DOWNLOADED
    const downloadedRepo: DownloadedRepository = {
      id: repoId,
      name: repoName,
      url: repoUrl,
      status: RepositoryStatus.DOWNLOADED,
      downloadDate: Date.now(),
    };

    // Save to local storage
    saveDownloadedRepository(downloadedRepo);

    // Now start the ingestion process with the zip data
    return startIngestion(downloadedRepo, zipData);
  } catch (error) {
    console.error("Error downloading repository:", error);

    // Update status to error
    const errorRepo: DownloadedRepository = {
      id: repoId,
      name: repoName,
      url: repoUrl,
      status: RepositoryStatus.ERROR,
      error: `Error downloading repository: ${error}`,
    };

    // Save error state
    saveDownloadedRepository(errorRepo);
    return errorRepo;
  }
};

// Helper function to unzip the repository
const unzipRepository = async (
  zipData: ArrayBuffer,
): Promise<{ files: { [path: string]: Uint8Array }; readme: string }> => {
  try {
    const zip = await JSZip.loadAsync(zipData);
    const files: { [path: string]: Uint8Array } = {};
    let readme = "";

    // Process each file in the zip
    const promises = Object.keys(zip.files).map(async (filename) => {
      const file = zip.files[filename];

      if (!file.dir) {
        // Store file content
        const content = await file.async("uint8array");
        files[filename] = content;

        // Check if this is a README file (case insensitive)
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.includes("/readme.md") || lowerFilename === "readme.md") {
          const textDecoder = new TextDecoder("utf-8");
          readme = textDecoder.decode(content);
        }
      }
    });

    await Promise.all(promises);

    // If README wasn't found, check for other variants
    if (!readme) {
      for (const filename of Object.keys(zip.files)) {
        const lowerFilename = filename.toLowerCase();
        if (lowerFilename.includes("readme") && (lowerFilename.endsWith(".md") || lowerFilename.endsWith(".txt"))) {
          const content = await zip.files[filename].async("uint8array");
          const textDecoder = new TextDecoder("utf-8");
          readme = textDecoder.decode(content);
          break;
        }
      }
    }

    return { files, readme };
  } catch (error) {
    console.error("Error unzipping repository:", error);
    throw error;
  }
};

// Function to ignore common files/directories
const shouldIgnoreFile = (path: string): boolean => {
  const ignoredPatterns = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    ".DS_Store",
    ".idea/",
    ".vscode/",
    "coverage/",
    "__pycache__/",
    ".pytest_cache/",
    ".next/",
  ];

  return ignoredPatterns.some((pattern) => path.includes(pattern));
};

// Generate repository tree from unzipped files
const generateRepoTree = (files: { [path: string]: Uint8Array }): string => {
  // Get all file paths and filter out ignored ones
  const paths = Object.keys(files)
    .filter((path) => !shouldIgnoreFile(path))
    .sort();

  if (paths.length === 0) {
    return "Repository is empty or contains only ignored files.";
  }

  // Find the root folder name (usually repo-branch)
  const rootFolder = paths[0].split("/")[0];

  // Build the tree structure
  let tree = `${rootFolder}/\n`;
  let prevPath = "";
  const depth = 0;

  for (const path of paths) {
    // Skip the root folder itself
    if (path === rootFolder + "/" || path === rootFolder) {
      continue;
    }

    // Remove the root folder from path for cleaner display
    const relativePath = path.startsWith(rootFolder + "/") ? path.substring(rootFolder.length + 1) : path;

    if (!relativePath) continue;

    const parts = relativePath.split("/");
    let currentPath = rootFolder;
    let line = "";

    // Determine the depth and create appropriate indentation
    for (let i = 0; i < parts.length; i++) {
      currentPath += "/" + parts[i];

      // Check if this is a directory
      const isDirectory = i < parts.length - 1 || files[path] === null;

      // Determine if this path component was already processed
      const alreadyProcessed = prevPath && prevPath.startsWith(currentPath);

      if (!alreadyProcessed) {
        // Calculate indent
        const indent = "│   ".repeat(i);
        const prefix = i === parts.length - 1 ? "└── " : "├── ";

        // Add the line to the tree
        line = `${indent}${prefix}${parts[i]}${isDirectory ? "/" : ""}`;
        tree += line + "\n";
      }
    }

    prevPath = path;
  }

  return tree;
};

// Ingest repository data
export const startIngestion = async (
  repo: DownloadedRepository,
  zipData: ArrayBuffer,
): Promise<DownloadedRepository> => {
  // Update status to INGESTING
  const ingestingRepo: DownloadedRepository = {
    ...repo,
    status: RepositoryStatus.INGESTING,
  };

  // Save the ingesting state
  saveDownloadedRepository(ingestingRepo);

  try {
    // Unzip the repository
    const { files, readme } = await unzipRepository(zipData);

    // Generate the repository tree
    const repoTree = generateRepoTree(files);

    // Update status to INGESTED and set as READY
    const ingestedRepo: DownloadedRepository = {
      ...ingestingRepo,
      status: RepositoryStatus.INGESTED,
      readmeContent: readme || `No README found for ${repo.name}`,
      repoTree: repoTree,
    };

    // Save to local storage
    saveDownloadedRepository(ingestedRepo);

    return ingestedRepo;
  } catch (error) {
    console.error("Error ingesting repository:", error);

    // Update status to error
    const errorRepo: DownloadedRepository = {
      ...repo,
      status: RepositoryStatus.ERROR,
      error: `Error ingesting repository: ${error}`,
    };

    // Save error state
    saveDownloadedRepository(errorRepo);
    return errorRepo;
  }
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

// Helper function to get a human-readable status message
export const getStatusMessage = (status: RepositoryStatus): string => {
  switch (status) {
    case RepositoryStatus.PENDING:
      return "Waiting to process";
    case RepositoryStatus.QUEUED:
      return "Queued for download";
    case RepositoryStatus.DOWNLOADING:
      return "Downloading...";
    case RepositoryStatus.DOWNLOADED:
      return "Downloaded, preparing to process";
    case RepositoryStatus.INGESTING:
      return "Processing repository...";
    case RepositoryStatus.INGESTED:
    case RepositoryStatus.READY:
      return "Ready";
    case RepositoryStatus.ERROR:
      return "Error occurred";
    default:
      return "Unknown status";
  }
};
