/**
 * Complexity Analyzer
 *
 * Analyzes code to calculate cyclomatic complexity of functions and methods.
 * Cyclomatic complexity measures the number of linearly independent paths through code.
 */

import fs from 'fs';
import { logError } from '../../../../utils/logFormatter.js';

// Constants
const SERVICE_NAME = 'swift-mcp-service';
const SERVICE_VERSION = '1.0.0';

// Complexity increasing patterns
const COMPLEXITY_PATTERNS = [
  // Control flow statements
  /\bif\s*\(/g, // if statements
  /\belse\s+if\s*\(/g, // else if statements
  /\bfor\s*\(/g, // for loops
  /\bforeach\s*\(/g, // foreach loops
  /\bwhile\s*\(/g, // while loops
  /\bdo\s*\{/g, // do-while loops
  /\bswitch\s*\(/g, // switch statements
  /\bcase\s+[^:]+:/g, // case statements (each increases complexity)
  /\bcatch\s*\(/g, // catch blocks
  /\breturn/g, // early returns (each increases complexity)
  /\?\s*[^:]+\s*:/g, // ternary operators
  /\|\|/g, // logical OR (short-circuit increases complexity)
  /&&/g, // logical AND (short-circuit increases complexity)
];

/**
 * Calculate cyclomatic complexity for a single file
 *
 * @param content - File content
 * @returns Cyclomatic complexity score
 */
function calculateFileComplexity(content: string): number {
  // Start with base complexity of 1
  let complexity = 1;

  // Remove comments and strings to avoid false positives
  const cleanedContent = removeCommentsAndStrings(content);

  // Count complexity-increasing patterns
  for (const pattern of COMPLEXITY_PATTERNS) {
    const matches = cleanedContent.match(pattern) || [];
    complexity += matches.length;
  }

  return complexity;
}

/**
 * Remove comments and string literals from code to avoid false positives
 *
 * @param code - Original source code
 * @returns Code with comments and strings removed
 */
function removeCommentsAndStrings(code: string): string {
  // Remove single-line comments
  let cleanedCode = code.replace(/\/\/.*$/gm, '');

  // Remove multi-line comments
  cleanedCode = cleanedCode.replace(/\/\*[\s\S]*?\*\//g, '');

  // Remove string literals (both single and double quotes)
  cleanedCode = cleanedCode.replace(/'[^']*'/g, "''");
  cleanedCode = cleanedCode.replace(/"[^"]*"/g, '""');

  // Remove template literals
  cleanedCode = cleanedCode.replace(/`[^`]*`/g, '``');

  return cleanedCode;
}

/**
 * Analyze code complexity across all files
 *
 * @param files - Array of file paths to analyze
 * @returns Object mapping file paths to complexity scores
 */
export async function analyzeCodeComplexity(files: string[]): Promise<Record<string, number>> {
  const complexityScores: Record<string, number> = {};

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const complexity = calculateFileComplexity(content);
      complexityScores[file] = complexity;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(`Error analyzing complexity for ${file}`, SERVICE_NAME, SERVICE_VERSION, err, {
        context: {
          module: 'codeQuality',
          function: 'analyzeCodeComplexity',
          filePath: file,
        },
      });
      // Set a default value for files that couldn't be analyzed
      complexityScores[file] = 1;
    }
  }

  return complexityScores;
}
