"use client";

import { githubApiService } from "./github-api-service";
import { fileProcessorService } from "./file-processor-service";

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
  dirs?: string[]; // List of directories in the repository
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

// Download repository (actual implementation)
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
    // Download the repository as a ZIP file
    const zipData = await githubApiService.downloadRepositoryZip(repoUrl);

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

    // Now start the ingestion process
    return startIngestion(downloadedRepo, zipData);
  } catch (error) {
    console.error("Error downloading repository:", error);

    // Update status to error
    const errorRepo: DownloadedRepository = {
      id: repoId,
      name: repoName,
      url: repoUrl,
      status: RepositoryStatus.PENDING,
      downloadDate: Date.now(),
    };

    saveDownloadedRepository(errorRepo);
    throw error;
  }
};

// Process repository data (actual implementation)
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
    // Process the ZIP file
    const { rootDirName, files, metadata, dirtextFiles, dirmetaFiles } =
      await fileProcessorService.processRepositoryZip(zipData);

    // Store dirtext and dirmeta files in localStorage or IndexedDB
    // (Due to size limitations, these might need to be stored in IndexedDB in a real implementation)
    await storeProcessedFiles(repo.id, dirtextFiles, dirmetaFiles);

    // Generate repository tree structure
    const repoTree = generateRepoTree(metadata);

    // Find README content if available
    const readmeContent = findReadmeContent(files);

    // List of directories for navigation
    const dirs = Object.keys(metadata).sort();

    // Update status to INGESTED and set as READY
    const ingestedRepo: DownloadedRepository = {
      ...ingestingRepo,
      status: RepositoryStatus.INGESTED,
      repoTree,
      readmeContent,
      dirs,
    };

    // Save to local storage
    saveDownloadedRepository(ingestedRepo);

    return ingestedRepo;
  } catch (error) {
    console.error("Error ingesting repository:", error);

    // Update status to error/pending
    const errorRepo: DownloadedRepository = {
      ...repo,
      status: RepositoryStatus.PENDING,
    };

    saveDownloadedRepository(errorRepo);
    throw error;
  }
};

// Store processed files (would use IndexedDB in production)
async function storeProcessedFiles(
  repoId: string,
  dirtextFiles: { [dirPath: string]: string },
  dirmetaFiles: { [dirPath: string]: string },
): Promise<void> {
  try {
    // In a production implementation, we would use IndexedDB
    // For this demo, we'll store in localStorage with a prefix

    // Store dirtext files
    for (const [dirPath, content] of Object.entries(dirtextFiles)) {
      const key = `${repoId}_dirtext_${dirPath || "root"}`;
      localStorage.setItem(key, content);
    }

    // Store dirmeta files
    for (const [dirPath, content] of Object.entries(dirmetaFiles)) {
      const key = `${repoId}_dirmeta_${dirPath || "root"}`;
      localStorage.setItem(key, content);
    }

    // Store directory list
    localStorage.setItem(`${repoId}_dirs`, JSON.stringify(Object.keys(dirtextFiles)));
  } catch (error) {
    console.error("Error storing processed files:", error);
    throw error;
  }
}

// Find README content in the repository files
function findReadmeContent(files: { [path: string]: Uint8Array | string }): string {
  const readmeRegex = /readme\.md$/i;

  for (const [path, content] of Object.entries(files)) {
    if (readmeRegex.test(path) && typeof content === "string") {
      return content;
    }
  }

  return "No README found in this repository.";
}

// Generate a repository tree structure
function generateRepoTree(metadata: { [path: string]: any[] }): string {
  let tree = "Repository Structure:\n";

  // Sort directories for consistent output
  const directories = Object.keys(metadata).sort();

  // Build tree structure
  for (const dir of directories) {
    const level = dir ? dir.split("/").length : 0;
    const indent = "  ".repeat(level);
    const dirName = dir.split("/").pop() || "root";

    tree += `${indent}/${dirName}/\n`;

    // Add files in this directory
    const files = metadata[dir] || [];
    files.sort((a, b) => a.name.localeCompare(b.name));

    for (const file of files) {
      tree += `${indent}  ${file.name}\n`;
    }
  }

  return tree;
}

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

// Get dirtext content for a specific directory in a repository
export const getDirtextContent = (repoId: string, dirPath: string = ""): string => {
  try {
    const key = `${repoId}_dirtext_${dirPath || "root"}`;
    return localStorage.getItem(key) || "";
  } catch (error) {
    console.error("Error getting dirtext content:", error);
    return "";
  }
};

// Get dirmeta content for a specific directory in a repository
export const getDirmetaContent = (repoId: string, dirPath: string = ""): string => {
  try {
    const key = `${repoId}_dirmeta_${dirPath || "root"}`;
    return localStorage.getItem(key) || "";
  } catch (error) {
    console.error("Error getting dirmeta content:", error);
    return "";
  }
};

// Get list of directories in a repository
export const getRepositoryDirectories = (repoId: string): string[] => {
  try {
    const dirsJson = localStorage.getItem(`${repoId}_dirs`);
    return dirsJson ? JSON.parse(dirsJson) : [];
  } catch (error) {
    console.error("Error getting repository directories:", error);
    return [];
  }
};
