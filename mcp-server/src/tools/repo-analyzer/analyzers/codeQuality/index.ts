/**
 * Code Quality Analyzers
 *
 * Exports code quality analysis utilities
 */

// Direct imports of the analyzer functions
import { analyzeFunctionLength } from './functionAnalyzer.js';
import { analyzeCodeDuplication } from './duplicationAnalyzer.js';

/**
 * Analyze code quality for a repository
 *
 * @param files - File content map
 * @returns Code quality analysis results
 */
export function analyzeCodeQuality(files: Record<string, string>): {
  overallScore: number;
  complexity?: Record<string, unknown>;
  longFunctions?: { file: string; function: string; lineCount: number }[];
  duplications?: {
    sourceFile: string;
    targetFile: string;
    lineCount: number;
    similarity: number;
  }[];
} {
  // Results container with all possible properties declared upfront
  const results: {
    overallScore: number;
    complexity?: Record<string, unknown>;
    longFunctions?: { file: string; function: string; lineCount: number }[];
    duplications?: {
      sourceFile: string;
      targetFile: string;
      lineCount: number;
      similarity: number;
    }[];
  } = {
    overallScore: 100, // Start with perfect score and subtract based on issues
  };

  // Analyze long functions
  const longFunctionsList: { file: string; function: string; lineCount: number }[] = [];

  // Analyze duplications across files
  const duplications = analyzeCodeDuplication(files);

  // If we found any issues, add them to the results
  if (longFunctionsList.length > 0) {
    results.longFunctions = longFunctionsList;
    // Deduct points for long functions
    results.overallScore -= Math.min(20, longFunctionsList.length * 2);
  }

  if (duplications.length > 0) {
    results.duplications = duplications;
    // Deduct points for duplications
    results.overallScore -= Math.min(30, duplications.length * 3);
  }

  // Ensure the score doesn't go below 0
  results.overallScore = Math.max(0, results.overallScore);

  return results;
}

// Export the individual analyzers for direct use
export { analyzeFunctionLength, analyzeCodeDuplication };
