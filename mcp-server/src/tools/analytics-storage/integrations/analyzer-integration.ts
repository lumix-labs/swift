import { AnalyticsCollector } from '../collector/base-collector.js';
import { logInfo, logError } from '../../../utils/logFormatter.js';

/**
 * Integration with Repository Analyzer tool
 * 
 * Extracts and stores analytics data from repository analyzer results
 * 
 * @param analyzerResults - Results from the repo-analyzer tool
 * @returns Result of storage operation or null if failed
 */
export async function storeRepoAnalyzerResults(analyzerResults: any): Promise<any | null> {
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';
  
  try {
    if (!analyzerResults || !analyzerResults.repositoryPath) {
      throw new Error('Invalid analyzer results: missing repository path');
    }
    
    // Extract repository information
    const repoPath = analyzerResults.repositoryPath;
    const repoName = repoPath.split('/').pop() || 'unknown';
    
    // Create analytics collector
    const collector = new AnalyticsCollector(
      'repo-analyzer',
      '1.0.0', // Should be dynamically retrieved in a real implementation
      {
        name: repoName,
        // branch and commitHash would be populated in a real implementation
      }
    );
    
    // Extract summary data
    const summaryData: any = {
      repositoryPath: repoPath,
      excludePaths: analyzerResults.excludePaths || [],
    };
    
    // Include language metrics if available
    if (analyzerResults.languages) {
      summaryData.languages = {
        totalFiles: analyzerResults.languages.summary.totalFiles,
        totalLines: analyzerResults.languages.summary.totalLines,
        languageCount: analyzerResults.languages.summary.languageCount,
        primaryLanguage: analyzerResults.languages.distribution[0]?.language || 'unknown',
      };
    }
    
    // Include code quality metrics if available
    if (analyzerResults.codeQuality) {
      summaryData.codeQuality = {
        overallScore: analyzerResults.codeQuality.overallScore,
        complexityIssues: Object.keys(analyzerResults.codeQuality.complexity || {}).length,
        longFunctions: analyzerResults.codeQuality.longFunctions?.length || 0,
        duplicationPercentage: calculateDuplicationPercentage(analyzerResults.codeQuality),
      };
    }
    
    // Include dependency metrics if available
    if (analyzerResults.dependencies) {
      summaryData.dependencies = {
        total: analyzerResults.dependencies.dependencies?.length || 0,
        circular: analyzerResults.dependencies.cycles?.length || 0,
        external: analyzerResults.dependencies.externalDependencies?.size || 0,
      };
    }
    
    // Include impact analysis if available
    if (analyzerResults.impact) {
      summaryData.impact = {
        highImpactFiles: analyzerResults.impact.mostImpactfulFiles?.slice(0, 5) || [],
        isolatedFiles: analyzerResults.impact.isolatedFiles?.length || 0,
      };
    }
    
    // Store the analytics data
    const result = await collector.store(summaryData, analyzerResults);
    
    logInfo(`Stored repo analyzer results for: ${repoName}`, SERVICE_NAME, SERVICE_VERSION, {
      context: {
        repositoryPath: repoPath,
        snapshotId: result.snapshotId,
      }
    });
    
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    logError(`Error storing repo analyzer results`, SERVICE_NAME, SERVICE_VERSION, err);
    
    return null;
  }
}

/**
 * Integration with Security Analyzer tool
 * 
 * Extracts and stores analytics data from security analyzer results
 * 
 * @param analyzerResults - Results from the security-analyzer tool
 * @returns Result of storage operation or null if failed
 */
export async function storeSecurityAnalyzerResults(analyzerResults: any): Promise<any | null> {
  const SERVICE_NAME = 'swift-mcp-service';
  const SERVICE_VERSION = '1.0.0';
  
  try {
    if (!analyzerResults || !analyzerResults.repositoryPath) {
      throw new Error('Invalid analyzer results: missing repository path');
    }
    
    // Extract repository information
    const repoPath = analyzerResults.repositoryPath;
    const repoName = repoPath.split('/').pop() || 'unknown';
    
    // Create analytics collector
    const collector = new AnalyticsCollector(
      'security-analyzer',
      '1.0.0', // Should be dynamically retrieved in a real implementation
      {
        name: repoName,
        // branch and commitHash would be populated in a real implementation
      }
    );
    
    // Extract summary data
    const summaryData: any = {
      repositoryPath: repoPath,
      excludePaths: analyzerResults.excludePaths || [],
    };
    
    // Include vulnerability metrics if available
    if (analyzerResults.vulnerabilities) {
      summaryData.vulnerabilities = {
        total: analyzerResults.vulnerabilities.total || 0,
        critical: countVulnerabilitiesBySeverity(analyzerResults.vulnerabilities, 'critical'),
        high: countVulnerabilitiesBySeverity(analyzerResults.vulnerabilities, 'high'),
        medium: countVulnerabilitiesBySeverity(analyzerResults.vulnerabilities, 'medium'),
        low: countVulnerabilitiesBySeverity(analyzerResults.vulnerabilities, 'low'),
      };
    }
    
    // Include dependency security metrics if available
    if (analyzerResults.dependencies) {
      summaryData.dependencyVulnerabilities = {
        total: analyzerResults.dependencies.vulnerabilities?.length || 0,
        critical: countDependencyVulnerabilitiesBySeverity(analyzerResults.dependencies, 'critical'),
        high: countDependencyVulnerabilitiesBySeverity(analyzerResults.dependencies, 'high'),
        medium: countDependencyVulnerabilitiesBySeverity(analyzerResults.dependencies, 'medium'),
        low: countDependencyVulnerabilitiesBySeverity(analyzerResults.dependencies, 'low'),
      };
    }
    
    // Include overall security score if available
    if (analyzerResults.securityScore) {
      summaryData.securityScore = analyzerResults.securityScore;
    }
    
    // Store the analytics data
    const result = await collector.store(summaryData, analyzerResults);
    
    logInfo(`Stored security analyzer results for: ${repoName}`, SERVICE_NAME, SERVICE_VERSION, {
      context: {
        repositoryPath: repoPath,
        snapshotId: result.snapshotId,
      }
    });
    
    return result;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    logError(`Error storing security analyzer results`, SERVICE_NAME, SERVICE_VERSION, err);
    
    return null;
  }
}

/**
 * Calculate code duplication percentage from code quality results
 * 
 * @param codeQuality - Code quality analysis results
 * @returns Duplication percentage or 0 if not available
 */
function calculateDuplicationPercentage(codeQuality: any): number {
  if (!codeQuality.duplications || !codeQuality.duplications.length) {
    return 0;
  }
  
  const totalDuplicatedLines = codeQuality.duplications.reduce(
    (sum: number, dup: any) => sum + (dup.lineCount || 0), 
    0
  );
  
  const totalLinesOfCode = Object.values(codeQuality.commentRatios || {})
    .reduce((sum: number, ratio: any) => sum + (ratio.codeLines || 0), 0);
  
  if (!totalLinesOfCode) {
    return 0;
  }
  
  return parseFloat(((totalDuplicatedLines / totalLinesOfCode) * 100).toFixed(1));
}

/**
 * Count vulnerabilities by severity from vulnerabilities results
 * 
 * @param vulnerabilities - Vulnerability analysis results
 * @param severity - Severity level to count
 * @returns Count of vulnerabilities at the specified severity
 */
function countVulnerabilitiesBySeverity(vulnerabilities: any, severity: string): number {
  if (!vulnerabilities.issues) {
    return 0;
  }
  
  return vulnerabilities.issues.filter((issue: any) => 
    issue.severity && issue.severity.toLowerCase() === severity.toLowerCase()
  ).length;
}

/**
 * Count dependency vulnerabilities by severity from dependencies results
 * 
 * @param dependencies - Dependency analysis results
 * @param severity - Severity level to count
 * @returns Count of vulnerabilities at the specified severity
 */
function countDependencyVulnerabilitiesBySeverity(dependencies: any, severity: string): number {
  if (!dependencies.vulnerabilities) {
    return 0;
  }
  
  return dependencies.vulnerabilities.filter((vuln: any) => 
    vuln.severity && vuln.severity.toLowerCase() === severity.toLowerCase()
  ).length;
}
