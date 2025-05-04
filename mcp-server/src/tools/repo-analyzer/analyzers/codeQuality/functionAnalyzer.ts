/**
 * Function Analyzer
 *
 * Analyzes functions in code to identify long functions and other
 * quality issues related to function structure.
 */

/**
 * Extract functions from the provided source code
 *
 * @param content - Source code content
 * @returns Array of functions with their line counts
 */
export function extractFunctions(content: string): {
  name: string;
  lineCount: number;
  file: string;
}[] {
  // Simple extraction logic for demo purposes
  // In a real implementation, this would use language-specific parsers
  const lines = content.split('\n');
  const functions: { name: string; lineCount: number; file: string }[] = [];

  // This is a simplified implementation
  // In practice, we would use a more robust parser for each language
  let currentFunction = '';
  let startLine = 0;
  let inFunction = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Very simplified function detection
    if (
      !inFunction &&
      (line.includes('function ') || line.match(/\w+\s*\([^)]*\)\s*{/) || line.match(/\w+\s*=\s*function\s*\(/))
    ) {
      inFunction = true;
      startLine = i;
      braceCount = 0;

      // Extract function name (very simplified)
      const nameMatch =
        line.match(/function\s+(\w+)/) || line.match(/(\w+)\s*\(/) || line.match(/(\w+)\s*=\s*function/);

      currentFunction = nameMatch ? nameMatch[1] : 'anonymous';

      // Count opening braces
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
    } else if (inFunction) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      // End of function
      if (braceCount === 0 && line.includes('}')) {
        const lineCount = i - startLine + 1;
        functions.push({
          name: currentFunction,
          lineCount,
          file: 'current-file.js', // In a real implementation, this would be the actual file path
        });

        inFunction = false;
      }
    }
  }

  return functions;
}

/**
 * Analyze function length to identify overly long functions
 *
 * @param content - Source code content
 * @param filePath - Path to the file being analyzed
 * @param threshold - Line count threshold for "long" functions (default: 50)
 * @returns Array of long functions
 */
export function analyzeFunctionLength(
  content: string,
  filePath: string,
  threshold: number = 50
): {
  file: string;
  function: string;
  lineCount: number;
}[] {
  const functions = extractFunctions(content);

  // Find functions that exceed the threshold
  const longFunctions = functions
    .filter((fn) => fn.lineCount > threshold)
    .map((fn) => ({
      file: filePath,
      function: fn.name,
      lineCount: fn.lineCount,
    }));

  return longFunctions;
}
