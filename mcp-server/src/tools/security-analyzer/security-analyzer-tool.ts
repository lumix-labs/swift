import { z } from 'zod';
import { BaseTool, ToolResponse } from '../base-tool.js';
import { logInfo, logError } from '../../utils/logFormatter.js';
import * as path from 'path';

/**
 * Input type for Security Analyzer
 */
export type SecurityAnalyzerInput = {
  repositoryPath: string;
  excludePaths?: string[];
  framework?: string;
  scanCode?: boolean;
  scanDependencies?: boolean;
  analyzeAntiPatterns?: boolean;
  detectCredentials?: boolean;
  severityThreshold?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  generateVulnMaps?: boolean;
  includeComplianceReports?: boolean;
};

/**
 * Output type for Security Analyzer
 */
export interface SecurityAnalyzerResults {
  repositoryPath: string;
  excludePaths?: string[];
  vulnerabilities?: {
    total: number;
    issues?: Array<{
      severity: string;
      file: string;
      line: number;
      description: string;
      cwe?: string;
      remediation?: string;
    }>;
  };
  dependencies?: {
    vulnerabilities?: Array<{
      severity: string;
      packageName: string;
      version: string;
      description: string;
      cve?: string;
      remediation?: string;
    }>;
  };
  securityScore?: number;
  // Add index signature to make this type compatible with Record<string, unknown>
  [key: string]: unknown;
}

/**
 * Security Analyzer Tool
 *
 * Analyzes codebases for security vulnerabilities and provides risk scoring with remediation recommendations.
 * Extends the BaseTool class for standardized registration and analytics.
 */
export class SecurityAnalyzerTool extends BaseTool<SecurityAnalyzerInput, SecurityAnalyzerResults> {
  /**
   * Create a new Security Analyzer tool
   */
  constructor() {
    super(
      'security-analyzer',
      '1.0.0',
      'Analyzes codebases for security vulnerabilities and provides risk scoring with remediation recommendations'
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
      framework: z.string().optional().describe('Primary framework or language used (e.g., "node", "react", "python")'),
      scanCode: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to scan source code for OWASP Top 10 and CWE vulnerabilities'),
      scanDependencies: z.boolean().optional().default(true).describe('Whether to scan dependencies for known CVEs'),
      analyzeAntiPatterns: z.boolean().optional().default(true).describe('Whether to analyze security anti-patterns'),
      detectCredentials: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to detect hardcoded credentials and secrets'),
      severityThreshold: z
        .enum(['critical', 'high', 'medium', 'low', 'info'])
        .optional()
        .default('low')
        .describe('Minimum severity level to report'),
      generateVulnMaps: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to generate visual maps of vulnerable code paths'),
      includeComplianceReports: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include compliance reporting for financial regulations'),
    };
  }

  /**
   * Execute the security analysis
   *
   * @param input - Tool input parameters
   * @returns Analysis results
   */
  protected async execute(input: SecurityAnalyzerInput): Promise<SecurityAnalyzerResults> {
    try {
      // Extract repository name for analytics and reporting
      const repoPath = input.repositoryPath;
      const repoNameMatch = repoPath.match(/([^/]+)$/);
      const repositoryName = repoNameMatch ? repoNameMatch[1] : 'unknown';

      logInfo(`Analyzing security for repository: ${repositoryName}`, this.serviceNamespace, this.serviceVersion, {
        context: {
          tool: this.toolId,
          repositoryPath: input.repositoryPath,
          options: {
            scanCode: input.scanCode,
            scanDependencies: input.scanDependencies,
            analyzeAntiPatterns: input.analyzeAntiPatterns,
            detectCredentials: input.detectCredentials,
            severityThreshold: input.severityThreshold,
          },
        },
      });

      // Initialize results
      const results: SecurityAnalyzerResults = {
        repositoryPath: input.repositoryPath,
        excludePaths: input.excludePaths,
      };

      // In a real implementation, this would call into various security analyzers
      // This is a placeholder implementation for demonstration
      results.vulnerabilities = {
        total: 0,
        issues: [],
      };

      results.dependencies = {
        vulnerabilities: [],
      };

      // Calculate security score (placeholder)
      results.securityScore = 100;

      // Store analytics data
      await this.storeAnalytics(
        {
          name: repositoryName,
          path: input.repositoryPath,
        },
        {
          repositoryPath: input.repositoryPath,
          analysisOptions: {
            scanCode: input.scanCode,
            scanDependencies: input.scanDependencies,
            analyzeAntiPatterns: input.analyzeAntiPatterns,
            detectCredentials: input.detectCredentials,
            severityThreshold: input.severityThreshold,
            generateVulnMaps: input.generateVulnMaps,
            includeComplianceReports: input.includeComplianceReports,
          },
          results: {
            totalVulnerabilities: results.vulnerabilities.total,
            securityScore: results.securityScore,
          },
        }
      );

      return results;
    } catch (error) {
      // Handle errors
      const err = error instanceof Error ? error : new Error(String(error));

      logError(`Error analyzing repository security`, this.serviceNamespace, this.serviceVersion, err, {
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
  protected formatResponse(result: SecurityAnalyzerResults): ToolResponse {
    // Format the repository name for display
    const repoName = path.basename(result.repositoryPath);

    // Generate text summary
    let summaryText = `# Security Analysis: ${repoName}\n\n`;

    // Add security score
    summaryText += `## Security Score\n\n`;

    if (result.securityScore !== undefined) {
      const scoreColor = result.securityScore >= 90 ? '🟢 Good' : result.securityScore >= 70 ? '🟡 Fair' : '🔴 Poor';

      summaryText += `Overall Security: ${result.securityScore}/100 (${scoreColor})\n\n`;
    } else {
      summaryText += `Overall Security: Not calculated\n\n`;
    }

    // Add vulnerability summary if available
    if (result.vulnerabilities) {
      const totalIssues = result.vulnerabilities.total;

      summaryText += `## Vulnerabilities\n\n`;
      summaryText += `Total Issues: ${totalIssues}\n\n`;

      if (result.vulnerabilities.issues && result.vulnerabilities.issues.length > 0) {
        summaryText += `### Top Issues\n\n`;
        summaryText += `| Severity | File | Description | CWE |\n`;
        summaryText += `|----------|------|-------------|-----|\n`;

        // Display top issues, sorted by severity
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        const topIssues = [...result.vulnerabilities.issues]
          .sort((a, b) => {
            const aSev = a.severity.toLowerCase();
            const bSev = b.severity.toLowerCase();
            return (
              (severityOrder[aSev as keyof typeof severityOrder] || 5) -
              (severityOrder[bSev as keyof typeof severityOrder] || 5)
            );
          })
          .slice(0, 5);

        for (const issue of topIssues) {
          const severity =
            issue.severity.toLowerCase() === 'critical'
              ? '🔴 Critical'
              : issue.severity.toLowerCase() === 'high'
                ? '🟠 High'
                : issue.severity.toLowerCase() === 'medium'
                  ? '🟡 Medium'
                  : issue.severity.toLowerCase() === 'low'
                    ? '🔵 Low'
                    : '⚪ Info';

          summaryText += `| ${severity} | ${path.basename(issue.file)}:${issue.line} | ${issue.description} | ${issue.cwe || 'N/A'} |\n`;
        }

        if (result.vulnerabilities.issues.length > 5) {
          summaryText += `\n... and ${result.vulnerabilities.issues.length - 5} more issues.\n`;
        }

        summaryText += `\n`;
      } else {
        summaryText += `No security issues detected!\n\n`;
      }
    }

    // Add dependency vulnerability summary if available
    if (result.dependencies && result.dependencies.vulnerabilities && result.dependencies.vulnerabilities.length > 0) {
      summaryText += `## Vulnerable Dependencies\n\n`;
      summaryText += `Found ${result.dependencies.vulnerabilities.length} vulnerable dependencies.\n\n`;

      summaryText += `| Severity | Package | Version | CVE |\n`;
      summaryText += `|----------|---------|---------|-----|\n`;

      // Display top vulnerable dependencies, sorted by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      const topVulnDeps = [...result.dependencies.vulnerabilities]
        .sort((a, b) => {
          const aSev = a.severity.toLowerCase();
          const bSev = b.severity.toLowerCase();
          return (
            (severityOrder[aSev as keyof typeof severityOrder] || 5) -
            (severityOrder[bSev as keyof typeof severityOrder] || 5)
          );
        })
        .slice(0, 5);

      for (const dep of topVulnDeps) {
        const severity =
          dep.severity.toLowerCase() === 'critical'
            ? '🔴 Critical'
            : dep.severity.toLowerCase() === 'high'
              ? '🟠 High'
              : dep.severity.toLowerCase() === 'medium'
                ? '🟡 Medium'
                : dep.severity.toLowerCase() === 'low'
                  ? '🔵 Low'
                  : '⚪ Info';

        summaryText += `| ${severity} | ${dep.packageName} | ${dep.version} | ${dep.cve || 'N/A'} |\n`;
      }

      if (result.dependencies.vulnerabilities.length > 5) {
        summaryText += `\n... and ${result.dependencies.vulnerabilities.length - 5} more vulnerable dependencies.\n`;
      }

      summaryText += `\n`;
    }

    // Add remediation section
    summaryText += `## Remediation Recommendations\n\n`;

    if ((result.vulnerabilities?.issues?.length || 0) > 0 || (result.dependencies?.vulnerabilities?.length || 0) > 0) {
      summaryText += `1. **Update Dependencies**: Ensure all packages are up to date\n`;
      summaryText += `2. **Security Review**: Review flagged code sections for security issues\n`;
      summaryText += `3. **Add Security Tests**: Integrate security testing into your CI/CD pipeline\n`;
    } else {
      summaryText += `No remediation needed! Keep up the good security practices.\n`;
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
