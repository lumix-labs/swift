import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { scanDirectory } from '../../utils/fileUtils.js';
import { validateRepositoryPath } from '../../utils/pathUtils.js';

/**
 * File metadata from the indexing process
 */
export interface FileMetadata {
  path: string; // Relative path from repository root
  type: string; // File type/extension
  size: number; // File size in bytes
  modifiedTime: Date; // Last modification timestamp
  checksum: string; // Content hash for comparison
}

/**
 * Indexing phase results
 */
export interface IndexingResult {
  totalFiles: number;
  totalSize: number; // Total size in bytes
  fileTypes: Record<string, number>; // Count of each file type
  files: FileMetadata[]; // Detailed metadata for each file
}

/**
 * Generate a checksum (hash) for file content
 *
 * @param filePath - Path to the file
 * @returns SHA-256 hash of the file content
 */
export function generateFileChecksum(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch (error) {
    // Return an empty hash if file can't be read
    return '';
  }
}

/**
 * Analyze a repository's files, extracting metadata for analysis
 *
 * This function recursively scans all files in a repository, extracting
 * metadata such as file type, size, modification time, and a content
 * checksum that can be used for change detection and comparison.
 *
 * @param repositoryPath - Path to the repository root
 * @param excludePaths - Paths to exclude from analysis
 * @returns File indexing results with metadata
 */
export async function indexRepository(
  repositoryPath: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<IndexingResult> {
  // Validate the repository path
  validateRepositoryPath(repositoryPath);

  // Get all files in the repository
  const filePaths = await scanDirectory(repositoryPath, excludePaths);

  const files: FileMetadata[] = [];
  const fileTypes: Record<string, number> = {};
  let totalSize = 0;

  // Process each file to extract metadata
  for (const filePath of filePaths) {
    try {
      const stats = fs.statSync(filePath);
      const relativePath = path.relative(repositoryPath, filePath);
      const fileType = path.extname(filePath).substring(1).toLowerCase() || 'unknown';

      // Update file type count
      fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;

      // Generate metadata
      const metadata: FileMetadata = {
        path: relativePath,
        type: fileType,
        size: stats.size,
        modifiedTime: stats.mtime,
        checksum: generateFileChecksum(filePath),
      };

      files.push(metadata);
      totalSize += stats.size;
    } catch (error) {
      // Skip files that can't be analyzed
      continue;
    }
  }

  return {
    totalFiles: files.length,
    totalSize,
    fileTypes,
    files,
  };
}
