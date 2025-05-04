import fs from 'fs';
import path from 'path';
import { logError } from '../../../utils/logFormatter.js';

/**
 * Utility functions for file operations in the repo-analyzer tool
 */

const SERVICE_NAME = 'swift-mcp-service';
const SERVICE_VERSION = '1.0.0';
const CONTEXT_MODULE = 'repo-analyzer';

/**
 * Checks if a path should be excluded from analysis
 *
 * @param filePath - The file path to check
 * @param excludePaths - List of paths to exclude
 * @returns True if the path should be excluded, false otherwise
 */
export function shouldExcludePath(filePath: string, excludePaths: string[]): boolean {
  return excludePaths.some(
    (excludePath) => filePath.includes(`/${excludePath}/`) || filePath.endsWith(`/${excludePath}`)
  );
}

/**
 * Recursively scan a directory and collect all file paths
 *
 * @param directoryPath - The directory to scan
 * @param excludePaths - Paths to exclude from scanning
 * @returns Array of file paths
 */
export async function scanDirectory(directoryPath: string, excludePaths: string[] = []): Promise<string[]> {
  const files: string[] = [];

  // Ensure the directory exists
  if (!fs.existsSync(directoryPath)) {
    throw new Error(`Directory not found: ${directoryPath}`);
  }

  // Get all entries in the directory
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  // Process each entry
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    // Skip excluded paths
    if (shouldExcludePath(entryPath, excludePaths)) {
      continue;
    }

    if (entry.isDirectory()) {
      // Recursively scan subdirectories
      const subDirectoryFiles = await scanDirectory(entryPath, excludePaths);
      files.push(...subDirectoryFiles);
    } else {
      // Add file paths
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Count the number of lines in a file
 *
 * @param filePath - Path to the file
 * @returns Number of lines in the file
 */
export function countLinesInFile(filePath: string): number {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Count newlines in the file
    return content.split('\n').length;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError(`Error reading file ${filePath}`, SERVICE_NAME, SERVICE_VERSION, err, {
      context: {
        module: CONTEXT_MODULE,
        function: 'countLinesInFile',
        filePath,
      },
    });
    return 0;
  }
}

/**
 * Get file extension from path
 *
 * @param filePath - Path to the file
 * @returns The file extension (without the dot)
 */
export function getFileExtension(filePath: string): string {
  const ext = path.extname(filePath);
  return ext.startsWith('.') ? ext.substring(1).toLowerCase() : ext.toLowerCase();
}
