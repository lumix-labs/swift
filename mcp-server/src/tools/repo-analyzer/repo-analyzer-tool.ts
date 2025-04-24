import { z } from 'zod';
import { BaseTool } from '../base-tool.js';
import { analyzeRepository } from './analyzers/index.js';

/**
 * Input type for Repository Analyzer
 */
export interface RepoAnalyzerInput {
  repositoryPath: string;
  excludePaths?: string[];
  includeLanguages?: string[];
  includeHidden?: boolean;
}

/**
 * Output type for Repository Analyzer
 */
export interface RepoAnalyzerOutput {
  repositoryName: string;
  languageBreakdown: Record<string, { lines: number; percentage: number }>;
  fileTypes: Record<string, number>;
  totalFiles: number;
  totalLines: number;
  directoryStructure?: Record<string, unknown>;
  codeQuality?: {
    overallScore: number;
    complexity?: Record<string, unknown>;
    longFunctions?: { file: string; function: string; lineCount: number }[];
    duplications?: {
      sourceFile: string;
      targetFile: string;
      lineCount: number;
      similarity: number;
    }[];
  };
}

/**
 * Repository Analyzer Tool Implementation
 */
export class RepoAnalyzerTool extends BaseTool<RepoAnalyzerInput, RepoAnalyzerOutput> {
  constructor() {
    super('repo-analyzer', '1.0.0', 'Analyzes repository structure and code composition');
  }

  protected getSchema(): Record<string, z.ZodType<unknown>> {
    return {
      repositoryPath: z.string().describe('Path to the repository to analyze'),
      excludePaths: z.array(z.string()).optional().describe('Paths to exclude from analysis'),
      includeLanguages: z
        .array(z.string())
        .optional()
        .describe('Only analyze these programming languages'),
      includeHidden: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include hidden files and directories'),
    };
  }

  protected async execute(input: RepoAnalyzerInput): Promise<RepoAnalyzerOutput> {
    // Extract repository name from path
    const repoNameMatch = input.repositoryPath.match(/([^/]+)$/);
    const repositoryName = repoNameMatch ? repoNameMatch[1] : 'unknown-repo';

    // Analyze the repository
    const startTime = Date.now();
    const analysisResults = await analyzeRepository(
      input.repositoryPath,
      input.excludePaths || [],
      input.includeLanguages || [],
      input.includeHidden || false
    );
    const endTime = Date.now();

    // Store analytics data
    await this.storeAnalytics(
      {
        name: repositoryName,
        path: input.repositoryPath,
      },
      {
        execution_time_ms: endTime - startTime,
        total_files: analysisResults.totalFiles,
        total_lines: analysisResults.totalLines,
        language_count: Object.keys(analysisResults.languageBreakdown).length,
        code_quality_score: analysisResults.codeQuality?.overallScore || 0,
      }
    );

    return analysisResults;
  }

  /**
   * Format the response for the client
   */
  protected formatResponse(result: RepoAnalyzerOutput): Record<string, unknown> {
    // Create a user-friendly text representation of the results
    const languageBreakdown = Object.entries(result.languageBreakdown)
      .map(
        ([lang, data]) =>
          `${lang}: ${data.lines.toLocaleString()} lines (${data.percentage.toFixed(2)}%)`
      )
      .join('\n');

    const fileTypeBreakdown = Object.entries(result.fileTypes)
      .map(([ext, count]) => `${ext}: ${count} files`)
      .join('\n');

    const formattedText = `
# Repository Analysis: ${result.repositoryName}

## Summary
- Total Files: ${result.totalFiles.toLocaleString()}
- Total Lines: ${result.totalLines.toLocaleString()}
- Languages: ${Object.keys(result.languageBreakdown).length}

## Language Breakdown
${languageBreakdown}

## File Types
${fileTypeBreakdown}
`;

    return {
      content: [
        {
          type: 'text',
          text: formattedText.trim(),
        },
      ],
      results: result,
    };
  }
}
