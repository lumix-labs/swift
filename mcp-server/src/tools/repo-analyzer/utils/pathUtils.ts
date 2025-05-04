import path from 'path';
import fs from 'fs';
import { logWarning } from '../../../utils/logFormatter.js';

/**
 * Utility functions for path handling in the repo-analyzer tool
 */

const SERVICE_NAME = 'swift-mcp-service';
const SERVICE_VERSION = '1.0.0';
const CONTEXT_MODULE = 'repo-analyzer';

/**
 * Validates a repository path and ensures it exists
 *
 * @param repositoryPath - Path to validate
 * @throws Error if the path does not exist or is not a directory
 */
export function validateRepositoryPath(repositoryPath: string): void {
  // Check if path exists
  if (!fs.existsSync(repositoryPath)) {
    throw new Error(`Repository path does not exist: ${repositoryPath}`);
  }

  // Check if path is a directory
  if (!fs.statSync(repositoryPath).isDirectory()) {
    throw new Error(`Repository path is not a directory: ${repositoryPath}`);
  }

  // Optional: Check if it's actually a git repository
  const gitPath = path.join(repositoryPath, '.git');
  if (!fs.existsSync(gitPath)) {
    logWarning(
      `Path does not appear to be a git repository (no .git directory): ${repositoryPath}`,
      SERVICE_NAME,
      SERVICE_VERSION,
      {
        context: {
          module: CONTEXT_MODULE,
          function: 'validateRepositoryPath',
          repositoryPath,
        },
      }
    );
  }
}

/**
 * Resolves a relative path within a repository
 *
 * @param repositoryPath - Base repository path
 * @param relativePath - Relative path within the repository
 * @returns Absolute path
 */
export function resolveRepositoryPath(repositoryPath: string, relativePath: string): string {
  return path.resolve(repositoryPath, relativePath);
}

/**
 * Gets the relative path from repository root
 *
 * @param repositoryPath - Repository root path
 * @param absolutePath - Absolute file path
 * @returns Relative path from repository root
 */
export function getRelativePath(repositoryPath: string, absolutePath: string): string {
  return path.relative(repositoryPath, absolutePath);
}
