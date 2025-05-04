/**
 * Code Quality Analyzer
 *
 * This module provides code quality analysis functionality, including:
 * - Complexity analysis
 * - Function length analysis
 * - Code duplication detection
 * - Comment ratio calculations
 */

import * as fs from 'fs';
import * as path from 'path';
import { analyzeFunctionLength } from './functionAnalyzer.js';
import { analyzeCodeDuplication } from './duplicationAnalyzer.js';
import { logInfo, logError } from '../../../../utils/logFormatter.js';

/**
 * Interface for code quality analysis results
 */
export interface CodeQualityResult {
  overallScore: number;
  complexity?: Record<string, unknown>;
  longFunctions?: { file: string; function: string; lineCount: number }[];
  duplications?: { sourceFile: string; targetFile: string; lineCount: number; similarity: number }[];
  commentRatios?: Record<string, { codeLines: number; commentLines: number; ratio: number }>;
}

/**
 * Analyze code quality for a repository
 *
 * @param repositoryPath - Path to the repository
 * @param excludePaths - Paths to exclude from analysis
 * @returns Code quality analysis results
 */
export async function analyzeCodeQuality(
  repositoryPath: string,
  excludePaths: string[] = []
): Promise<CodeQualityResult> {
  try {
    // Map file extensions to language-specific analyzers
    const fileExtensions = new Map<string, boolean>([
      ['.js', true],
      ['.ts', true],
      ['.jsx', true],
      ['.tsx', true],
      ['.py', true],
      ['.java', true],
      ['.kt', true],
      ['.swift', true],
      ['.go', true],
      ['.rs', true],
      ['.cpp', true],
      ['.cc', true],
      ['.c', true],
      ['.h', true],
      ['.hpp', true],
      ['.cs', true],
      ['.php', true],
      ['.rb', true],
    ]);

    // Collect all code files
    const files = await collectCodeFiles(repositoryPath, fileExtensions, excludePaths);

    // Load file contents
    const filesContent = new Map<string, string>();

    for (const filePath of files) {
      try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        filesContent.set(filePath, content);
      } catch (error) {
        logError(`Error reading file: ${filePath}`, 'repo-analyzer', '1.0.0', error as Error);
      }
    }

    logInfo(`Analyzing code quality for ${filesContent.size} files`, 'repo-analyzer', '1.0.0');

    // Analyze function length
    const longFunctions: { file: string; function: string; lineCount: number }[] = [];

    for (const [filePath, content] of filesContent.entries()) {
      try {
        const longFunctionsInFile = analyzeFunctionLength(content, filePath);
        longFunctions.push(...longFunctionsInFile);
      } catch (error) {
        logError(`Error analyzing function length in file: ${filePath}`, 'repo-analyzer', '1.0.0', error as Error);
      }
    }

    // Analyze code duplication
    let duplications: { sourceFile: string; targetFile: string; lineCount: number; similarity: number }[] = [];

    try {
      duplications = analyzeCodeDuplication(filesContent);
    } catch (error) {
      logError('Error analyzing code duplication', 'repo-analyzer', '1.0.0', error as Error);
    }

    // Calculate comment ratios
    const commentRatios: Record<string, { codeLines: number; commentLines: number; ratio: number }> = {};

    for (const [filePath, content] of filesContent.entries()) {
      try {
        const { codeLines, commentLines, ratio } = calculateCommentRatio(content);
        commentRatios[filePath] = { codeLines, commentLines, ratio };
      } catch (error) {
        logError(`Error calculating comment ratio in file: ${filePath}`, 'repo-analyzer', '1.0.0', error as Error);
      }
    }

    // Calculate overall score
    let overallScore = 100;

    // Deduct points for long functions
    overallScore -= Math.min(20, longFunctions.length * 2);

    // Deduct points for duplications
    overallScore -= Math.min(20, duplications.length * 5);

    // Adjust for low comment ratio
    const avgCommentRatio =
      Object.values(commentRatios).reduce((sum, { ratio }) => sum + ratio, 0) /
      Math.max(1, Object.values(commentRatios).length);

    if (avgCommentRatio < 0.1) {
      overallScore -= 10;
    }

    // Ensure score is within range
    overallScore = Math.max(0, Math.min(100, overallScore));

    return {
      overallScore,
      longFunctions: longFunctions.length > 0 ? longFunctions : undefined,
      duplications: duplications.length > 0 ? duplications : undefined,
      commentRatios,
    };
  } catch (error) {
    logError('Error analyzing code quality', 'repo-analyzer', '1.0.0', error as Error);

    // Return minimal result
    return {
      overallScore: 0,
    };
  }
}

/**
 * Collect code files from a repository
 *
 * @param dir - Directory to scan
 * @param fileExtensions - Map of file extensions to include
 * @param excludePaths - Paths to exclude from scan
 * @returns Array of file paths
 */
async function collectCodeFiles(
  dir: string,
  fileExtensions: Map<string, boolean>,
  excludePaths: string[] = []
): Promise<string[]> {
  const files: string[] = [];

  // Standard directories to exclude
  const standardExcludes = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    'lib',
    'bin',
    'vendor',
    'bower_components',
  ];

  // Add standard excludes if not already present
  for (const exclude of standardExcludes) {
    if (!excludePaths.includes(exclude)) {
      excludePaths.push(exclude);
    }
  }

  async function scanDir(currentDir: string): Promise<void> {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      // Skip excluded paths
      if (excludePaths.some((exclude) => entryPath.includes(exclude))) {
        continue;
      }

      if (entry.isDirectory()) {
        await scanDir(entryPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);

        if (fileExtensions.has(ext)) {
          files.push(entryPath);
        }
      }
    }
  }

  await scanDir(dir);
  return files;
}

/**
 * Calculate comment ratio for source code
 *
 * @param content - Source code content
 * @returns Comment ratio metrics
 */
function calculateCommentRatio(content: string): {
  codeLines: number;
  commentLines: number;
  ratio: number;
} {
  const lines = content.split('\n');
  let codeLines = 0;
  let commentLines = 0;
  let inMultilineComment = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') {
      continue;
    }

    // Check for multiline comment
    if (inMultilineComment) {
      commentLines++;

      if (trimmedLine.includes('*/')) {
        inMultilineComment = false;

        // Check if there's code after the closing comment
        const codePart = trimmedLine.split('*/')[1]?.trim();

        if (codePart && codePart !== '' && !codePart.startsWith('//')) {
          codeLines++;
        }
      }

      continue;
    }

    // Check for single-line comment
    if (trimmedLine.startsWith('//')) {
      commentLines++;
      continue;
    }

    // Check for multi-line comment start
    if (trimmedLine.startsWith('/*')) {
      commentLines++;

      if (!trimmedLine.includes('*/')) {
        inMultilineComment = true;
      }

      continue;
    }

    // Check for code line with trailing comment
    if (trimmedLine.includes('//')) {
      codeLines++;
      commentLines++;
      continue;
    }

    // Regular code line
    codeLines++;
  }

  const total = codeLines + commentLines;
  const ratio = total > 0 ? commentLines / total : 0;

  return {
    codeLines,
    commentLines,
    ratio,
  };
}
