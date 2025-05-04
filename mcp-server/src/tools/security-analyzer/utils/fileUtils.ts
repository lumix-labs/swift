/**
 * File utility functions for security scanning
 */
import fs from 'fs/promises';
import path from 'path';
import { logInfo } from '../../../utils/logFormatter.js';

/**
 * Scan a directory recursively for files
 *
 * @param dir - Directory to scan
 * @param excludePaths - Paths to exclude (e.g., node_modules)
 * @param fileExtensions - File extensions to include (optional)
 * @returns Array of file paths
 */
export async function scanDirectory(
  dir: string,
  excludePaths: string[] = [],
  fileExtensions?: string[]
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      // Skip excluded paths
      if (excludePaths.some((exclude) => entryPath.includes(exclude))) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subDirFiles = await scanDirectory(entryPath, excludePaths, fileExtensions);
        files.push(...subDirFiles);
      } else if (entry.isFile()) {
        // Check file extension if specified
        if (!fileExtensions || fileExtensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(entryPath);
        }
      }
    }
  } catch (error) {
    logInfo(`Error scanning directory: ${dir}`, 'security-analyzer', '1.0.0');
  }

  return files;
}

/**
 * Read file content
 *
 * @param filePath - Path to the file
 * @returns File content as string
 */
export async function readFileContent(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    logInfo(`Error reading file: ${filePath}`, 'security-analyzer', '1.0.0');
    return '';
  }
}

/**
 * Get lines from a file
 *
 * @param filePath - Path to the file
 * @returns Array of lines
 */
export async function getFileLines(filePath: string): Promise<string[]> {
  const content = await readFileContent(filePath);
  return content.split('\n');
}
