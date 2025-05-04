/**
 * Comment Analyzer
 *
 * Analyzes comments in code files to:
 * - Calculate code-to-comment ratios
 * - Identify files with excessive comments
 * - Detect commented-out code
 */

import fs from 'fs';
import { logError } from '../../../../utils/logFormatter.js';

// Define the CommentRatio interface here instead of importing it
export interface CommentRatio {
  file: string;
  codeLines: number;
  commentLines: number;
  ratio: number;
  commentedOutCode: boolean;
}

// Constants
const SERVICE_NAME = 'swift-mcp-service';
const SERVICE_VERSION = '1.0.0';
const EXCESSIVE_COMMENT_RATIO = 0.5; // 50% or more of file is comments
const COMMENTED_CODE_PATTERNS = [
  // Patterns that suggest commented code (not regular comments)
  /\/\/\s*(?:function|class|const|let|var|import|export|if|for|while|switch|return|=)/,
  /\/\*+\s*(?:function|class|const|let|var|import|export|if|for|while|switch|return|=)/,
];

/**
 * Analyze comments in a file
 *
 * @param content - File content
 * @returns Object containing counts of code and comment lines
 */
function analyzeFileComments(content: string): {
  codeLines: number;
  commentLines: number;
  commentedCode: boolean;
} {
  const lines = content.split('\n');
  let codeLines = 0;
  let commentLines = 0;
  let inBlockComment = false;
  let commentedCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) continue;

    // Check for block comment opening/closing
    if (!inBlockComment && line.includes('/*')) {
      inBlockComment = true;
      commentLines++;

      // Check if this might be commented code
      if (!commentedCode) {
        commentedCode = COMMENTED_CODE_PATTERNS.some((pattern) => pattern.test(line));
      }

      // If block comment ends on the same line
      if (line.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Continue counting block comment lines
    if (inBlockComment) {
      commentLines++;

      // Check for end of block comment
      if (line.includes('*/')) {
        inBlockComment = false;
      }

      // Check if this might be commented code
      if (!commentedCode) {
        commentedCode = COMMENTED_CODE_PATTERNS.some((pattern) => pattern.test(line));
      }
      continue;
    }

    // Check for single-line comments
    if (line.startsWith('//')) {
      commentLines++;

      // Check if this might be commented code
      if (!commentedCode) {
        commentedCode = COMMENTED_CODE_PATTERNS.some((pattern) => pattern.test(line));
      }
      continue;
    }

    // Line contains code
    codeLines++;
  }

  return { codeLines, commentLines, commentedCode };
}

/**
 * Analyze comments across all files
 *
 * @param files - Array of file paths to analyze
 * @returns Object with comment ratios and files with excessive comments
 */
export async function analyzeComments(files: string[]): Promise<{
  commentRatios: Record<string, CommentRatio>;
  excessiveComments: string[];
}> {
  const commentRatios: Record<string, CommentRatio> = {};
  const excessiveComments: string[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const { codeLines, commentLines, commentedCode } = analyzeFileComments(content);

      // Only analyze files that have actual content
      if (codeLines + commentLines > 0) {
        const ratio = commentLines / (codeLines + commentLines);

        commentRatios[file] = {
          file,
          codeLines,
          commentLines,
          ratio,
          commentedOutCode: commentedCode,
        };

        // Check for excessive comments
        if (ratio >= EXCESSIVE_COMMENT_RATIO && commentLines > 10) {
          excessiveComments.push(file);
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(`Error analyzing comments in ${file}`, SERVICE_NAME, SERVICE_VERSION, err, {
        context: {
          module: 'codeQuality',
          function: 'analyzeComments',
          filePath: file,
        },
      });
    }
  }

  return { commentRatios, excessiveComments };
}
