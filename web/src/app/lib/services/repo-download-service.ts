"use client";

import JSZip from "jszip";
import { SenderType, SENDERS } from "../types/message";

// Update the interface to include the detailed tree structure
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
  detailedTree?: any; // Added to store detailed code structure tree
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

// Helper to extract methods and classes from code files
const extractCodeStructure = (filePath: string, content: Uint8Array): any => {
  const textDecoder = new TextDecoder("utf-8");
  let fileContent: string;

  try {
    fileContent = textDecoder.decode(content);
  } catch (error) {
    console.error(`Error decoding file ${filePath}:`, error);
    return { type: "file", name: filePath.split("/").pop(), error: "Decoding error" };
  }

  const fileExtension = filePath.split(".").pop()?.toLowerCase();
  const fileName = filePath.split("/").pop() || "";

  // Default file structure with just the name
  const fileStructure: any = {
    type: "file",
    name: fileName,
    language: fileExtension,
  };

  // Process according to file type
  if (['js', 'ts', 'jsx', 'tsx'].includes(fileExtension || '')) {
    // JavaScript/TypeScript processing
    fileStructure.members = [];

    // Extract classes
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?\s*{/g;
    let classMatch: RegExpExecArray | null;
    while ((classMatch = classRegex.exec(fileContent)) !== null) {
      const className = classMatch[1];
      const extendsClass = classMatch[2] || null;

      const classInfo: any = {
        type: "class",
        name: className,
        extends: extendsClass,
        methods: []
      };

      // Get approximate class content to extract methods
      const classStartIndex = classMatch.index;
      let braceCount = 1;
      let classEndIndex = classStartIndex + classMatch[0].length;

      while (braceCount > 0 && classEndIndex < fileContent.length) {
        if (fileContent[classEndIndex] === '{') braceCount++;
        if (fileContent[classEndIndex] === '}') braceCount--;
        classEndIndex++;
      }

      const classContent = fileContent.substring(classStartIndex, classEndIndex);

      // Extract methods
      const methodRegex = /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
      let methodMatch: RegExpExecArray | null;

      while ((methodMatch = methodRegex.exec(classContent)) !== null) {
        const methodName = methodMatch[1];
        classInfo.methods.push({
          type: "method",
          name: methodName,
          // Extract visibility
          visibility: methodMatch[0].includes("private") ? "private" :
            methodMatch[0].includes("protected") ? "protected" : "public",
          isAsync: methodMatch[0].includes("async")
        });
      }

      fileStructure.members.push(classInfo);
    }

    // Extract standalone functions
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\([^)]*\)/g;
    let functionMatch: RegExpExecArray | null;

    while ((functionMatch = functionRegex.exec(fileContent)) !== null) {
      const functionName = functionMatch[1];
      fileStructure.members.push({
        type: "function",
        name: functionName,
        isAsync: functionMatch[0].includes("async"),
        isExported: functionMatch[0].includes("export")
      });
    }

    // Extract arrow functions assigned to constants
    const arrowFunctionRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
    let arrowFunctionMatch: RegExpExecArray | null;

    while ((arrowFunctionMatch = arrowFunctionRegex.exec(fileContent)) !== null) {
      const functionName = arrowFunctionMatch[1];
      fileStructure.members.push({
        type: "function",
        name: functionName,
        isArrowFunction: true,
        isAsync: arrowFunctionMatch[0].includes("async"),
        isExported: arrowFunctionMatch[0].includes("export")
      });
    }
  }
  else if (['py'].includes(fileExtension || '')) {
    // Python processing
    fileStructure.members = [];

    // Extract classes
    const classRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g;
    let classMatch: RegExpExecArray | null;

    while ((classMatch = classRegex.exec(fileContent)) !== null) {
      const className = classMatch[1];
      const inherits = classMatch[2] || null;

      const classInfo: any = {
        type: "class",
        name: className,
        inherits: inherits,
        methods: []
      };

      // Extract methods within the class
      // Get approximate class content
      const classStartIndex = classMatch.index;
      const nextClassIndex = fileContent.indexOf("class ", classStartIndex + 1);
      const classEndIndex = nextClassIndex !== -1 ? nextClassIndex : fileContent.length;

      const classContent = fileContent.substring(classStartIndex, classEndIndex);

      // Extract docstrings
      const docstringMatch = classContent.match(/"""([\s\S]*?)"""/);
      if (docstringMatch) {
        classInfo.docstring = docstringMatch[1].trim();
      }

      // Extract methods
      const methodRegex = /def\s+(\w+)\s*\([^)]*\):/g;
      let methodMatch: RegExpExecArray | null;

      while ((methodMatch = methodRegex.exec(classContent)) !== null) {
        const methodName = methodMatch[1];
        const isPrivate = methodName.startsWith("_");

        classInfo.methods.push({
          type: "method",
          name: methodName,
          visibility: isPrivate ? "private" : "public"
        });
      }

      fileStructure.members.push(classInfo);
    }

    // Extract top-level functions
    const functionRegex = /def\s+(\w+)\s*\([^)]*\):/g;
    let functionMatch: RegExpExecArray | null;
    let classIndices: number[] = [];

    // Find all class indices to avoid extracting class methods as top-level functions
    const classStartRegex = /class\s+\w+(?:\([^)]+\))?:/g;
    let classStartMatch: RegExpExecArray | null;

    while ((classStartMatch = classStartRegex.exec(fileContent)) !== null) {
      classIndices.push(classStartMatch.index);
    }

    while ((functionMatch = functionRegex.exec(fileContent)) !== null) {
      // Check if this function is inside a class
      const isInsideClass = classIndices.some(index => {
        // Fixed: Added null check for functionMatch
        return functionMatch !== null &&
          functionMatch.index > index &&
          (functionMatch.index < fileContent.indexOf("class ", index + 1) ||
            fileContent.indexOf("class ", index + 1) === -1);
      });

      if (!isInsideClass) {
        const functionName = functionMatch[1];
        fileStructure.members.push({
          type: "function",
          name: functionName,
          visibility: functionName.startsWith("_") ? "private" : "public"
        });
      }
    }
  }
  else if (['java', 'kt', 'scala'].includes(fileExtension || '')) {
    // Java/Kotlin/Scala processing
    fileStructure.members = [];

    // Extract classes and interfaces
    const classRegex = /(?:public|private|protected)?\s*(?:abstract\s+)?(?:class|interface)\s+(\w+)(?:\s+(?:extends|implements)\s+([^{]+))?/g;
    let classMatch: RegExpExecArray | null;

    while ((classMatch = classRegex.exec(fileContent)) !== null) {
      const className = classMatch[1];
      const extendsImplements = classMatch[2] ? classMatch[2].trim() : null;

      const classInfo: any = {
        type: classMatch[0].includes("interface") ? "interface" : "class",
        name: className,
        extendsImplements: extendsImplements,
        methods: []
      };

      // Get approximate class content
      const classStartIndex = classMatch.index;
      let braceCount = 0;
      let classEndIndex = classStartIndex;

      // Find the opening brace
      while (classEndIndex < fileContent.length) {
        if (fileContent[classEndIndex] === '{') {
          braceCount = 1;
          break;
        }
        classEndIndex++;
      }

      // Find the closing brace
      classEndIndex++;
      while (braceCount > 0 && classEndIndex < fileContent.length) {
        if (fileContent[classEndIndex] === '{') braceCount++;
        if (fileContent[classEndIndex] === '}') braceCount--;
        classEndIndex++;
      }

      const classContent = fileContent.substring(classStartIndex, classEndIndex);

      // Extract methods
      const methodRegex = /(?:public|private|protected|default)?\s*(?:static\s+)?(?:final\s+)?(?:abstract\s+)?(?:<[^>]+>\s+)?(\w+)\s+(\w+)\s*\([^)]*\)/g;
      let methodMatch: RegExpExecArray | null;

      while ((methodMatch = methodRegex.exec(classContent)) !== null) {
        const returnType = methodMatch[1];
        const methodName = methodMatch[2];

        // Skip constructors which have the same name as the class
        if (methodName !== className) {
          classInfo.methods.push({
            type: "method",
            name: methodName,
            returnType: returnType,
            visibility: methodMatch[0].includes("private") ? "private" :
              methodMatch[0].includes("protected") ? "protected" :
                methodMatch[0].includes("default") ? "default" : "public",
            isStatic: methodMatch[0].includes("static"),
            isFinal: methodMatch[0].includes("final"),
            isAbstract: methodMatch[0].includes("abstract")
          });
        } else {
          classInfo.constructors = classInfo.constructors || [];
          classInfo.constructors.push({
            type: "constructor",
            name: methodName,
            visibility: methodMatch[0].includes("private") ? "private" :
              methodMatch[0].includes("protected") ? "protected" : "public"
          });
        }
      }

      fileStructure.members.push(classInfo);
    }
  }

  return fileStructure;
};

// Generate detailed tree with classes and methods
const generateDetailedTree = (files: { [path: string]: Uint8Array }): any => {
  const detailedTree: any = {
    type: "root",
    name: "repository",
    children: {}
  };

  // Get all file paths and filter out ignored ones
  const paths = Object.keys(files)
    .filter((path) => !shouldIgnoreFile(path))
    .sort();

  if (paths.length === 0) {
    return { message: "Repository is empty or contains only ignored files." };
  }

  // Find the root folder name (usually repo-branch)
  const rootFolder = paths[0].split("/")[0];
  detailedTree.name = rootFolder;

  // Process each file
  for (const path of paths) {
    // Skip the root folder itself
    if (path === rootFolder + "/" || path === rootFolder) {
      continue;
    }

    // Remove the root folder from path
    const relativePath = path.startsWith(rootFolder + "/") ? path.substring(rootFolder.length + 1) : path;
    if (!relativePath) continue;

    // Split path into parts
    const parts = relativePath.split("/");

    // Navigate through the tree structure
    let currentNode = detailedTree.children;

    // Create folder structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!currentNode[part]) {
        currentNode[part] = {
          type: "directory",
          name: part,
          children: {}
        };
      }
      currentNode = currentNode[part].children;
    }

    // Process the file
    const fileName = parts[parts.length - 1];
    const fileExtension = fileName.split(".").pop()?.toLowerCase();

    // Only extract code structure for code files
    const codeFileExtensions = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'kt', 'scala', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift'];

    if (fileExtension && codeFileExtensions.includes(fileExtension)) {
      currentNode[fileName] = extractCodeStructure(path, files[path]);
    } else {
      // For non-code files, just store basic info
      currentNode[fileName] = {
        type: "file",
        name: fileName,
        extension: fileExtension || "unknown"
      };
    }
  }

  return detailedTree;
};

// Function to post a message in the chat
const postMessageToChat = async (content: string): Promise<void> => {
  try {
    console.log("[REPO-READY] Creating repository ready message with content:", content);

    // Get the event dispatcher
    const event = new CustomEvent("repository-ready-message", {
      detail: {
        message: {
          content,
          sender: SENDERS[SenderType.SWIFT_ASSISTANT],
          role: "assistant"
        }
      }
    });

    console.log("[REPO-READY] Event object created:", JSON.stringify({
      type: event.type,
      detail: {
        content: event.detail.message.content,
        sender: event.detail.message.sender,
        role: event.detail.message.role
      }
    }));

    // Dispatch the event
    window.dispatchEvent(event);
    console.log("[REPO-READY] Repository ready message event dispatched");

    // Check if there's a way to debug event listeners
    console.log("[REPO-READY] Check for active repository-ready-message listeners in browser devtools");

  } catch (error) {
    console.error("[REPO-READY] Error posting message to chat:", error);
  }
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

  console.log(`[REPO-INGESTION] Starting ingestion for repository: ${repo.name} (${repo.id})`);

  // Save the ingesting state
  saveDownloadedRepository(ingestingRepo);

  try {
    // Unzip the repository
    console.log("[REPO-INGESTION] Unzipping repository data...");
    const { files, readme } = await unzipRepository(zipData);
    console.log(`[REPO-INGESTION] Repository unzipped, found ${Object.keys(files).length} files`);

    // Generate the repository tree
    console.log("[REPO-INGESTION] Generating repository tree...");
    const repoTree = generateRepoTree(files);
    console.log(`[REPO-INGESTION] Repository tree generated with length: ${repoTree.length} characters`);

    // Generate detailed tree with methods and classes
    console.log("[REPO-INGESTION] Generating detailed code structure tree...");
    const treeWithData = generateDetailedTree(files);

    // Log the size of the generated tree
    const treeSize = new Blob([JSON.stringify(treeWithData)]).size;
    const sizeInKB = treeSize / 1024;

    if (sizeInKB >= 1024) {
      console.log(`[REPO-INGESTION] Detailed tree size: ${(sizeInKB / 1024).toFixed(2)} MB`);
    } else {
      console.log(`[REPO-INGESTION] Detailed tree size: ${sizeInKB.toFixed(2)} KB`);
    }

    // Update status to INGESTED and set as READY
    const ingestedRepo: DownloadedRepository = {
      ...ingestingRepo,
      status: RepositoryStatus.INGESTED,
      readmeContent: readme || `No README found for ${repo.name}`,
      repoTree: repoTree,
      detailedTree: treeWithData,
    };

    console.log(`[REPO-INGESTION] Repository ingestion completed for ${repo.name}`);

    // Save to local storage
    saveDownloadedRepository(ingestedRepo);
    console.log(`[REPO-INGESTION] Repository data saved to local storage`);

    // Post a message to the chat that the repository is ready
    console.log("[REPO-INGESTION] Preparing to post repository ready message to chat");
    const readyMessage = `Repository **${repo.name}** is now ready! You can ask me questions about the code structure, implementation details, and more.`;
    await postMessageToChat(readyMessage);
    console.log("[REPO-INGESTION] Repository ready message posted to chat");

    return ingestedRepo;
  } catch (error) {
    console.error("[REPO-INGESTION] Error ingesting repository:", error);

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
