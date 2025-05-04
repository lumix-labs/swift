import { z } from 'zod';
import { BaseTool, ToolResponse } from '../base-tool.js';
import { analyzeLanguageDistribution } from './analyzers/languageAnalyzer.js';
import { analyzeCodeQuality } from './analyzers/codeQuality/index.js';
import { logInfo, logError } from '../../utils/logFormatter.js';
import * as path from 'path';

/**
 * Input type for Repo Analyzer
 */
export type RepoAnalyzerInput = {
  repositoryPath: string;
  excludePaths?: string[];
  includeLanguages?: boolean;
  includeCodeQuality?: boolean;
  includeDependencies?: boolean;
  includeSemantics?: boolean;
  includeIndexing?: boolean;
  includeCrossReferences?: boolean;
  includeFlowAnalysis?: boolean;
  includeImpactAnalysis?: boolean;
  includeVisualizations?: boolean;
};

/**
 * Output type for Repo Analyzer
 */
export interface RepoAnalyzerResults {
  repositoryPath: string;
  excludePaths?: string[];
  languages?: {
    summary: {
      totalFiles: number;
      totalLines: number;
      languageCount: number;
    };
    distribution: Array<{
      language: string;
      files: number;
      lines: number;
      percentage: number;
    }>;
  };
  codeQuality?: {
    overallScore: number;
    complexity?: Record<string, unknown>;
    longFunctions?: Array<{
      file: string;
      function: string;
      lineCount: number;
    }>;
    duplications?: Array<{
      sourceFile: string;
      targetFile: string;
      lineCount: number;
      similarity: number;
    }>;
    commentRatios?: Record<string, { codeLines: number; commentLines: number; ratio: number }>;
  };
  dependencies?: {
    dependencies?: Array<{
      source: string;
      target: string;
      type: string;
    }>;
    cycles?: Array<string[]>;
    externalDependencies?: Set<string>;
  };
  impact?: {
    mostImpactfulFiles?: Array<{
      file: string;
      impactScore: number;
    }>;
    isolatedFiles?: Array<string>;
  };
  // Add index signature to make this type compatible with Record<string, unknown>
  [key: string]: unknown;
}

/**
 * Repository Analyzer Tool
 *
 * Analyzes repository structure and composition, providing insights for technical leadership.
 * Extends the BaseTool class for standardized registration and analytics.
 */
export class RepoAnalyzerTool extends BaseTool<RepoAnalyzerInput, RepoAnalyzerResults> {
  /**
   * Create a new Repository Analyzer tool
   */
  constructor() {
    super(
      'repo-analyzer',
      '1.0.0',
      'Analyzes repository structure and composition, providing insights for technical leadership'
    );
  }

  /**
   * Define the schema for this tool
   */
  protected getSchema(): Record<string, z.ZodType<unknown>> {
    return {
      repositoryPath: z.string().describe('Path to the repository to analyze'),
      excludePaths: z
        .array(z.string())
        .optional()
        .default(['node_modules', 'dist', '.git', 'build'])
        .describe('Paths to exclude from analysis (e.g., node_modules)'),
      includeLanguages: z.boolean().optional().default(true).describe('Whether to analyze language distribution'),
      includeCodeQuality: z.boolean().optional().default(false).describe('Whether to analyze code quality metrics'),
      includeDependencies: z.boolean().optional().default(false).describe('Whether to analyze code dependencies'),
      includeSemantics: z.boolean().optional().default(false).describe('Whether to perform semantic code analysis'),
      includeIndexing: z.boolean().optional().default(false).describe('Whether to perform file indexing analysis'),
      includeCrossReferences: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to build cross-reference database'),
      includeFlowAnalysis: z.boolean().optional().default(false).describe('Whether to analyze data and control flow'),
      includeImpactAnalysis: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to perform change impact analysis'),
      includeVisualizations: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to generate visualization data structures'),
    };
  }

  /**
   * Execute the repository analysis
   *
   * @param input - Tool input parameters
   * @returns Analysis results
   */
  protected async execute(input: RepoAnalyzerInput): Promise<RepoAnalyzerResults> {
    try {
      // Extract repository name for analytics and reporting
      const repoPath = input.repositoryPath;
      const repoNameMatch = repoPath.match(/([^/]+)$/);
      const repositoryName = repoNameMatch ? repoNameMatch[1] : 'unknown';

      logInfo(`Analyzing repository: ${repositoryName}`, this.serviceNamespace, this.serviceVersion, {
        context: {
          tool: this.toolId,
          repositoryPath: input.repositoryPath,
          options: {
            includeLanguages: input.includeLanguages,
            includeCodeQuality: input.includeCodeQuality,
            includeDependencies: input.includeDependencies,
            // ... other options
          },
        },
      });

      // Initialize results
      const results: RepoAnalyzerResults = {
        repositoryPath: input.repositoryPath,
        excludePaths: input.excludePaths,
      };

      // Analyze language distribution if requested
      if (input.includeLanguages) {
        results.languages = await analyzeLanguageDistribution(input.repositoryPath, input.excludePaths);
      }

      // Analyze code quality if requested
      if (input.includeCodeQuality) {
        results.codeQuality = await analyzeCodeQuality(input.repositoryPath, input.excludePaths);
      }

      // Other analyses would be added here in a complete implementation

      // Store analytics data
      await this.storeAnalytics(
        {
          name: repositoryName,
          path: input.repositoryPath,
        },
        {
          repositoryPath: input.repositoryPath,
          analysisOptions: {
            includeLanguages: input.includeLanguages,
            includeCodeQuality: input.includeCodeQuality,
            includeDependencies: input.includeDependencies,
            includeSemantics: input.includeSemantics,
            includeIndexing: input.includeIndexing,
            includeCrossReferences: input.includeCrossReferences,
            includeFlowAnalysis: input.includeFlowAnalysis,
            includeImpactAnalysis: input.includeImpactAnalysis,
            includeVisualizations: input.includeVisualizations,
          },
          results: {
            languageCount: results.languages?.summary.languageCount || 0,
            totalFiles: results.languages?.summary.totalFiles || 0,
            codeQualityScore: results.codeQuality?.overallScore || 0,
          },
        }
      );

      return results;
    } catch (error) {
      // Handle errors
      const err = error instanceof Error ? error : new Error(String(error));

      logError(`Error analyzing repository`, this.serviceNamespace, this.serviceVersion, err, {
        context: {
          tool: this.toolId,
          repositoryPath: input.repositoryPath,
        },
      });

      throw err;
    }
  }

  /**
   * Format the response for the client
   *
   * @param result - Analysis results
   * @returns Formatted response
   */
  protected formatResponse(result: RepoAnalyzerResults): ToolResponse {
    // Format the repository name for display
    const repoName = path.basename(result.repositoryPath);

    // Generate text summary
    let summaryText = `# Repository Analysis: ${repoName}\n\n`;

    // Add language distribution summary if available
    if (result.languages) {
      summaryText += `## Language Distribution\n\n`;
      summaryText += `Total Files: ${result.languages.summary.totalFiles}\n`;
      summaryText += `Total Lines: ${result.languages.summary.totalLines}\n`;
      summaryText += `Languages: ${result.languages.summary.languageCount}\n\n`;

      summaryText += `### Top Languages\n\n`;
      summaryText += `| Language | Files | Lines | Percentage |\n`;
      summaryText += `|----------|-------|-------|------------|\n`;

      // Display top 5 languages
      const topLanguages = [...result.languages.distribution].sort((a, b) => b.percentage - a.percentage).slice(0, 5);

      for (const lang of topLanguages) {
        summaryText += `| ${lang.language} | ${lang.files} | ${lang.lines} | ${lang.percentage.toFixed(2)}% |\n`;
      }

      summaryText += `\n`;
    }

    // Add code quality summary if available
    if (result.codeQuality) {
      summaryText += `## Code Quality\n\n`;
      summaryText += `Overall Score: ${result.codeQuality.overallScore}/100\n\n`;

      if (result.codeQuality.longFunctions && result.codeQuality.longFunctions.length > 0) {
        summaryText += `### Long Functions\n\n`;
        summaryText += `Found ${result.codeQuality.longFunctions.length} functions that exceed recommended length.\n\n`;

        summaryText += `| File | Function | Line Count |\n`;
        summaryText += `|------|----------|------------|\n`;

        // Display top 5 longest functions
        const topLongFunctions = [...result.codeQuality.longFunctions]
          .sort((a, b) => b.lineCount - a.lineCount)
          .slice(0, 5);

        for (const func of topLongFunctions) {
          summaryText += `| ${path.basename(func.file)} | ${func.function} | ${func.lineCount} |\n`;
        }

        summaryText += `\n`;
      }

      if (result.codeQuality.duplications && result.codeQuality.duplications.length > 0) {
        summaryText += `### Code Duplications\n\n`;
        summaryText += `Found ${result.codeQuality.duplications.length} instances of code duplication.\n\n`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: summaryText,
        },
      ],
      result: result,
    };
  }
}
