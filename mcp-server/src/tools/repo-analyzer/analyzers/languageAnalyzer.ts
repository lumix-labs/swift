import { scanDirectory, getFileExtension, countLinesInFile } from '../utils/fileUtils.js';
import { validateRepositoryPath } from '../utils/pathUtils.js';

/**
 * Represents a programming language with associated metrics
 */
export interface LanguageMetrics {
  language: string;
  files: number;
  lines: number;
  percentage: number;
}

/**
 * Summary metrics for language analysis
 */
export interface LanguageSummary {
  totalFiles: number;
  totalLines: number;
  languageCount: number;
}

/**
 * Complete language analysis results
 */
export interface LanguageAnalysisResult {
  summary: LanguageSummary;
  distribution: LanguageMetrics[];
}

/**
 * Map of file extensions to programming languages
 */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // Web/JavaScript
  js: 'JavaScript',
  jsx: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  sass: 'SCSS',
  less: 'LESS',

  // Backend
  py: 'Python',
  java: 'Java',
  rb: 'Ruby',
  php: 'PHP',
  go: 'Go',
  rs: 'Rust',
  c: 'C',
  cpp: 'C++',
  h: 'C/C++ Header',
  hpp: 'C++ Header',
  cs: 'C#',
  swift: 'Swift',
  kt: 'Kotlin',

  // Data/Config
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  toml: 'TOML',
  ini: 'INI',
  md: 'Markdown',
  csv: 'CSV',
  sql: 'SQL',

  // Shell/Scripts
  sh: 'Shell',
  bash: 'Shell',
  ps1: 'PowerShell',
  bat: 'Batch',
  cmd: 'Batch',

  // Other
  dockerfile: 'Dockerfile',
  gitignore: 'Git Config',
  env: 'Environment',
};

/**
 * Determines programming language from file extension
 *
 * @param filePath - Path to the file
 * @returns The detected programming language or 'Other'
 */
export function detectLanguage(filePath: string): string {
  const extension = getFileExtension(filePath);

  // Check if we have a mapping for this extension
  if (extension in EXTENSION_TO_LANGUAGE) {
    return EXTENSION_TO_LANGUAGE[extension];
  }

  // For files without extension, try to detect by filename
  const filename = filePath.split('/').pop()?.toLowerCase() || '';

  if (filename === 'dockerfile') {
    return 'Dockerfile';
  }

  if (filename === '.gitignore' || filename === '.gitattributes') {
    return 'Git Config';
  }

  return 'Other';
}

/**
 * Analyzes a repository for language distribution
 *
 * @param repositoryPath - Path to the repository
 * @param excludePaths - Paths to exclude from analysis
 * @returns Language analysis results
 */
export async function analyzeLanguageDistribution(
  repositoryPath: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<LanguageAnalysisResult> {
  // Validate the repository path
  validateRepositoryPath(repositoryPath);

  // Scan all files in the repository
  const files = await scanDirectory(repositoryPath, excludePaths);

  // Initialize language metrics
  const languageStats: Record<string, { files: number; lines: number }> = {};
  let totalLines = 0;

  // Process each file
  for (const file of files) {
    const language = detectLanguage(file);
    const lineCount = countLinesInFile(file);

    if (!languageStats[language]) {
      languageStats[language] = { files: 0, lines: 0 };
    }

    languageStats[language].files += 1;
    languageStats[language].lines += lineCount;
    totalLines += lineCount;
  }

  // Generate distribution with percentages
  const distribution: LanguageMetrics[] = Object.entries(languageStats)
    .map(([language, stats]) => ({
      language,
      files: stats.files,
      lines: stats.lines,
      percentage: totalLines > 0 ? parseFloat(((stats.lines / totalLines) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.lines - a.lines); // Sort by most lines of code

  // Create summary
  const summary: LanguageSummary = {
    totalFiles: files.length,
    totalLines: totalLines,
    languageCount: Object.keys(languageStats).length,
  };

  return {
    summary,
    distribution,
  };
}
