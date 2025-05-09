import { Repository } from "../lib/types/entities";
import { RepositoryStatus } from "../lib/services/repo-download-service";

/**
 * File metadata interface for storing file statistics
 */
export interface FileMetadata {
  path: string;
  language: string | string[]; // Single language for files, array for directories
  lineCount: number;
  wordCount: number;
  byteSize: number;
  lastModified?: number; // Unix timestamp
}

/**
 * Extended repository interface with download and status information
 */
export interface DownloadedRepository extends Repository {
  localPath?: string;
  downloadDate?: number;
  fileCount?: number;
  size?: number;
  readmeContent?: string;
  repoTree?: string; // Repository tree structure as a string
  fileMetadata?: Record<string, FileMetadata>; // Map of file paths to metadata
  directoryMetadata?: Record<string, FileMetadata>; // Aggregated metadata for directories
  status: RepositoryStatus;
}
