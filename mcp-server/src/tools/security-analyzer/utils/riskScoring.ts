/**
 * Risk scoring utilities for security vulnerabilities
 */

import { VulnerabilityItem, RemediationItem, CategoryRiskScore } from '../formatters/resultFormatter';

// Define interfaces for the risk scores
interface RiskScores {
  overallRiskScore: number;
  riskCategory: string;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  categoryRiskScores: Record<string, CategoryRiskScore>;
  riskTrend: string;
  remediationPriority: RemediationItem[];
}

/**
 * Generate risk scores for all vulnerabilities
 * 
 * @param codeVulnerabilities - Code vulnerabilities
 * @param dependencyVulnerabilities - Dependency vulnerabilities 
 * @param hardcodedCredentials - Hardcoded credentials
 * @param securityAntiPatterns - Security anti-patterns
 * @returns Risk scores and metrics
 */
export function generateRiskScores(
  codeVulnerabilities: VulnerabilityItem[],
  dependencyVulnerabilities: VulnerabilityItem[],
  hardcodedCredentials: VulnerabilityItem[],
  securityAntiPatterns: VulnerabilityItem[]
): RiskScores {
  // Combine all vulnerabilities
  const allVulnerabilities = [
    ...codeVulnerabilities,
    ...dependencyVulnerabilities,
    ...hardcodedCredentials,
    ...securityAntiPatterns
  ];
  
  // Count vulnerabilities by severity
  const severityCounts = {
    critical: allVulnerabilities.filter(v => v.severity.toLowerCase() === 'critical').length,
    high: allVulnerabilities.filter(v => v.severity.toLowerCase() === 'high').length,
    medium: allVulnerabilities.filter(v => v.severity.toLowerCase() === 'medium').length,
    low: allVulnerabilities.filter(v => v.severity.toLowerCase() === 'low').length,
    info: allVulnerabilities.filter(v => v.severity.toLowerCase() === 'info').length
  };
  
  // Calculate overall risk score (0-100)
  // Formula: Weighted sum of severities normalized to 0-100 scale
  const overallRiskScore = Math.min(100, Math.round(
    (severityCounts.critical * 10 +
     severityCounts.high * 5 +
     severityCounts.medium * 2 +
     severityCounts.low * 1) / 
    Math.max(1, allVulnerabilities.length) * 10
  ));
  
  // Calculate risk category
  let riskCategory: string;
  if (overallRiskScore >= 75) {
    riskCategory = 'Critical';
  } else if (overallRiskScore >= 50) {
    riskCategory = 'High';
  } else if (overallRiskScore >= 25) {
    riskCategory = 'Medium';
  } else {
    riskCategory = 'Low';
  }
  
  // Calculate risk metrics for different categories
  const categoryRiskScores = calculateCategoryRiskScores(allVulnerabilities);
  
  // Generate risk trend (simplified - in reality would compare to previous scans)
  const riskTrend = 'Unknown'; // Would be 'Increasing', 'Decreasing', or 'Stable'
  
  return {
    overallRiskScore,
    riskCategory,
    severityCounts,
    categoryRiskScores,
    riskTrend,
    remediationPriority: generateRemediationPriority(allVulnerabilities)
  };
}

/**
 * Calculate risk scores for different vulnerability categories
 * 
 * @param vulnerabilities - All vulnerabilities
 * @returns Risk scores by category
 */
function calculateCategoryRiskScores(vulnerabilities: VulnerabilityItem[]): Record<string, CategoryRiskScore> {
  // Define categories
  const categories = [
    'injection', 
    'authentication', 
    'authorization',
    'cryptography',
    'data-protection',
    'input-validation',
    'output-encoding',
    'session-management',
    'dependency',
    'configuration'
  ];
  
  // Initialize category scores
  const categoryScores: Record<string, CategoryRiskScore> = {};
  
  for (const category of categories) {
    const categoryVulns = vulnerabilities.filter(v => v.category === category);
    
    if (categoryVulns.length === 0) {
      categoryScores[category] = {
        score: 0,
        count: 0,
        label: 'None'
      };
      continue;
    }
    
    // Count by severity
    const criticalCount = categoryVulns.filter(v => v.severity.toLowerCase() === 'critical').length;
    const highCount = categoryVulns.filter(v => v.severity.toLowerCase() === 'high').length;
    const mediumCount = categoryVulns.filter(v => v.severity.toLowerCase() === 'medium').length;
    const lowCount = categoryVulns.filter(v => v.severity.toLowerCase() === 'low').length;
    
    // Calculate category score (0-100)
    const score = Math.min(100, Math.round(
      (criticalCount * 10 + highCount * 5 + mediumCount * 2 + lowCount * 1) * 5
    ));
    
    // Determine label
    let label: string;
    if (score >= 75) {
      label = 'Critical';
    } else if (score >= 50) {
      label = 'High';
    } else if (score >= 25) {
      label = 'Medium';
    } else {
      label = 'Low';
    }
    
    categoryScores[category] = {
      score,
      count: categoryVulns.length,
      label
    };
  }
  
  return categoryScores;
}

/**
 * Generate remediation priority list
 * 
 * @param vulnerabilities - All vulnerabilities
 * @returns Prioritized vulnerabilities for remediation
 */
function generateRemediationPriority(vulnerabilities: VulnerabilityItem[]): RemediationItem[] {
  // Clone the vulnerabilities array to avoid modifying the original
  const prioritized = [...vulnerabilities];
  
  // Calculate priority score for each vulnerability
  prioritized.forEach(vuln => {
    // Base priority on severity
    let priorityScore = 0;
    switch (vuln.severity.toLowerCase()) {
      case 'critical': priorityScore = 1000; break;
      case 'high': priorityScore = 500; break;
      case 'medium': priorityScore = 100; break;
      case 'low': priorityScore = 10; break;
      default: priorityScore = 1;
    }
    
    // Adjust for exploitability
    if (vuln.exploitability) {
      priorityScore *= vuln.exploitability as number;
    }
    
    // Adjust for business impact
    if (vuln.businessImpact) {
      priorityScore *= vuln.businessImpact as number;
    }
    
    // Store the calculated priority score
    vuln.priorityScore = priorityScore;
  });
  
  // Sort by priority score (highest first)
  return prioritized
    .sort((a, b) => (b.priorityScore as number) - (a.priorityScore as number))
    .slice(0, 20) // Limit to top 20 issues
    .map(vuln => {
      return {
        id: vuln.id,
        name: vuln.name,
        severity: vuln.severity,
        remediation: vuln.remediation,
        location: vuln.location
      };
    });
}
