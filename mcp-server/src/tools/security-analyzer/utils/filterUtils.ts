/**
 * Filter Utilities
 * 
 * Utilities for filtering security vulnerabilities
 */

import { SecurityAnalysisResults, VulnerabilityItem } from '../formatters/resultFormatter';

/**
 * Filter analysis results based on severity threshold
 * 
 * @param results - Security analysis results
 * @param threshold - Severity threshold to filter by
 */
export function filterResultsBySeverity(results: SecurityAnalysisResults, threshold: string): void {
  const severityLevels = {
    'critical': 4,
    'high': 3,
    'medium': 2,
    'low': 1,
    'info': 0
  };
  
  const thresholdLevel = severityLevels[threshold as keyof typeof severityLevels];
  
  // Filter code vulnerabilities
  if (results.codeVulnerabilities) {
    results.codeVulnerabilities = results.codeVulnerabilities.filter((vuln: VulnerabilityItem) => {
      const vulnLevel = severityLevels[vuln.severity.toLowerCase() as keyof typeof severityLevels];
      return vulnLevel >= thresholdLevel;
    });
  }
  
  // Filter dependency vulnerabilities
  if (results.dependencyVulnerabilities) {
    results.dependencyVulnerabilities = results.dependencyVulnerabilities.filter((vuln: VulnerabilityItem) => {
      const vulnLevel = severityLevels[vuln.severity.toLowerCase() as keyof typeof severityLevels];
      return vulnLevel >= thresholdLevel;
    });
  }
  
  // Filter hardcoded credentials
  if (results.hardcodedCredentials) {
    results.hardcodedCredentials = results.hardcodedCredentials.filter((cred: VulnerabilityItem) => {
      const credLevel = severityLevels[cred.severity.toLowerCase() as keyof typeof severityLevels];
      return credLevel >= thresholdLevel;
    });
  }
  
  // Filter security anti-patterns
  if (results.securityAntiPatterns) {
    results.securityAntiPatterns = results.securityAntiPatterns.filter((pattern: VulnerabilityItem) => {
      const patternLevel = severityLevels[pattern.severity.toLowerCase() as keyof typeof severityLevels];
      return patternLevel >= thresholdLevel;
    });
  }
}
