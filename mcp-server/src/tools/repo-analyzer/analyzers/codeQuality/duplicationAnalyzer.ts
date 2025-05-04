/**
 * Duplication Analyzer
 *
 * Identifies code duplication between files by comparing chunks of code.
 */

// Minimum line length to consider for duplication analysis
const MIN_LINE_LENGTH = 5;

/**
 * Clean and normalize a chunk of code for duplication analysis
 *
 * @param chunk - Code chunk to clean
 * @returns Cleaned code chunk
 */
export function cleanCodeChunk(chunk: string[]): string[] {
  const cleanedChunk = chunk
    .map((line: string) => {
      // Remove leading/trailing whitespace
      let cleanedLine = line.trim();

      // Remove comments
      cleanedLine = cleanedLine
        .replace(/\/\/.*$/g, '') // Remove single-line comments
        .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments

      // Skip lines that are too short
      if (!cleanedLine || cleanedLine.length < MIN_LINE_LENGTH) {
        return '';
      }

      return cleanedLine;
    })
    .filter((line: string) => line !== ''); // Remove empty lines

  return cleanedChunk;
}

/**
 * Calculate similarity between two code chunks
 *
 * @param chunk1 - First code chunk
 * @param chunk2 - Second code chunk
 * @returns Similarity score (0-1)
 */
export function calculateSimilarity(chunk1: string[], chunk2: string[]): number {
  // Clean both chunks
  const cleanedChunk1 = cleanCodeChunk(chunk1);
  const cleanedChunk2 = cleanCodeChunk(chunk2);

  // If either chunk is empty after cleaning, no duplication
  if (cleanedChunk1.length === 0 || cleanedChunk2.length === 0) {
    return 0;
  }

  // Count matching lines
  let matchingLines = 0;
  const minLength = Math.min(cleanedChunk1.length, cleanedChunk2.length);

  for (let i = 0; i < minLength; i++) {
    if (cleanedChunk1[i] === cleanedChunk2[i]) {
      matchingLines++;
    }
  }

  // Calculate similarity ratio
  return matchingLines / minLength;
}

/**
 * Analyze code for duplication between files
 *
 * @param filesContent - Map of file paths to their content
 * @param similarityThreshold - Threshold for similarity (default: 0.8)
 * @param chunkSize - Size of code chunks to compare (default: 10)
 * @returns Array of duplication results
 */
export function analyzeCodeDuplication(
  filesContent: Map<string, string>,
  similarityThreshold: number = 0.8,
  chunkSize: number = 10
): {
  sourceFile: string;
  targetFile: string;
  lineCount: number;
  similarity: number;
}[] {
  const duplications: {
    sourceFile: string;
    targetFile: string;
    lineCount: number;
    similarity: number;
  }[] = [];

  // Convert files to arrays of lines
  const filesLines = new Map<string, string[]>();

  for (const [filePath, content] of filesContent.entries()) {
    filesLines.set(filePath, content.split('\n'));
  }

  // Compare files for duplication
  const filePaths = Array.from(filesLines.keys());

  for (let i = 0; i < filePaths.length; i++) {
    const sourceFile = filePaths[i];
    const sourceLines = filesLines.get(sourceFile)!;

    // Skip small files
    if (sourceLines.length < chunkSize) {
      continue;
    }

    for (let j = i + 1; j < filePaths.length; j++) {
      const targetFile = filePaths[j];
      const targetLines = filesLines.get(targetFile)!;

      // Skip small files
      if (targetLines.length < chunkSize) {
        continue;
      }

      // Compare chunks
      for (let s = 0; s <= sourceLines.length - chunkSize; s++) {
        const sourceChunk = sourceLines.slice(s, s + chunkSize);

        for (let t = 0; t <= targetLines.length - chunkSize; t++) {
          const targetChunk = targetLines.slice(t, t + chunkSize);

          const similarity = calculateSimilarity(sourceChunk, targetChunk);

          if (similarity >= similarityThreshold) {
            // Find the maximum length of duplication
            let extendedSize = chunkSize;

            while (
              s + extendedSize < sourceLines.length &&
              t + extendedSize < targetLines.length &&
              sourceLines[s + extendedSize] === targetLines[t + extendedSize]
            ) {
              extendedSize++;
            }

            duplications.push({
              sourceFile,
              targetFile,
              lineCount: extendedSize,
              similarity,
            });

            // Skip ahead to avoid overlapping duplications
            t += extendedSize;
          }
        }
      }
    }
  }

  return duplications;
}
