/**
 * Security Results Formatter
 * 
 * Formats security analysis results as readable text
 */

/**
 * Interface for Security Analysis Results
 */
interface SecurityAnalysisResults {
  summary: {
    totalVulnerabilities: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
    infoVulnerabilities: number;
  };
  riskScores?: {
    overallRiskScore: number;
    riskCategory: string;
    categoryRiskScores: Record<string, CategoryRiskScore>;
    remediationPriority?: RemediationItem[];
  };
  codeVulnerabilities?: VulnerabilityItem[];
  dependencyVulnerabilities?: VulnerabilityItem[];
  hardcodedCredentials?: VulnerabilityItem[];
  securityAntiPatterns?: VulnerabilityItem[];
  complianceReports?: ComplianceReports;
  vulnerabilityMaps?: {
    heatmap?: HeatmapItem[];
  };
}

/**
 * Interface for Category Risk Score
 */
interface CategoryRiskScore {
  score: number;
  count: number;
  label: string;
}

/**
 * Interface for Remediation Item
 */
interface RemediationItem {
  id: string;
  name?: string;
  severity: string;
  remediation: string;
  location?: {
    file: string;
    line?: number;
  };
}

/**
 * Interface for Vulnerability Item
 */
interface VulnerabilityItem {
  id: string;
  name: string;
  severity: string;
  description: string;
  remediation: string;
  location?: {
    file: string;
    line?: number;
  };
  sourceCode?: string;
  packageName?: string;
  installedVersion?: string;
}

/**
 * Interface for Compliance Reports
 */
interface ComplianceReports {
  pciDss?: ComplianceReport;
  gdpr?: ComplianceReport;
  sox?: ComplianceReport;
}

/**
 * Interface for Compliance Report
 */
interface ComplianceReport {
  version?: string;
  compliant: boolean;
  summary: string;
  failedRequirements: FailedRequirement[];
}

/**
 * Interface for Failed Requirement
 */
interface FailedRequirement {
  requirement: {
    id: string;
    description: string;
  };
}

/**
 * Interface for Heatmap Item
 */
interface HeatmapItem {
  file: string;
  vulnerabilityCount: number;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Format security analysis results as readable text
 * 
 * @param results - Security analysis results
 * @returns Formatted text output
 */
export function formatSecurityResults(results: SecurityAnalysisResults): string {
  let output = '## Security Vulnerability Analysis Results\n\n';
  
  // Add summary section
  output += formatSummarySection(results);
  
  // Add risk scores section
  if (results.riskScores) {
    output += formatRiskScoresSection(results.riskScores);
  }
  
  // Add code vulnerabilities section
  if (results.codeVulnerabilities && results.codeVulnerabilities.length > 0) {
    output += formatVulnerabilitiesSection(
      'Code Vulnerabilities', 
      results.codeVulnerabilities
    );
  }
  
  // Add dependency vulnerabilities section
  if (results.dependencyVulnerabilities && results.dependencyVulnerabilities.length > 0) {
    output += formatVulnerabilitiesSection(
      'Dependency Vulnerabilities', 
      results.dependencyVulnerabilities
    );
  }
  
  // Add hardcoded credentials section
  if (results.hardcodedCredentials && results.hardcodedCredentials.length > 0) {
    output += formatVulnerabilitiesSection(
      'Hardcoded Credentials', 
      results.hardcodedCredentials
    );
  }
  
  // Add security anti-patterns section
  if (results.securityAntiPatterns && results.securityAntiPatterns.length > 0) {
    output += formatVulnerabilitiesSection(
      'Security Anti-Patterns', 
      results.securityAntiPatterns
    );
  }
  
  // Add compliance reports section
  if (results.complianceReports) {
    output += formatComplianceReportsSection(results.complianceReports);
  }
  
  // Add vulnerability maps section
  if (results.vulnerabilityMaps) {
    output += formatVulnerabilityMapsSection(results.vulnerabilityMaps);
  }
  
  // Add remediation recommendations section
  if (results.riskScores && results.riskScores.remediationPriority) {
    output += formatRemediationSection(results.riskScores.remediationPriority);
  }
  
  return output;
}

/**
 * Format summary section
 * 
 * @param results - Security analysis results
 * @returns Formatted summary section
 */
function formatSummarySection(results: SecurityAnalysisResults): string {
  let output = '### Summary\n\n';
  output += `- **Total Vulnerabilities:** ${results.summary.totalVulnerabilities}\n`;
  output += `- **Critical Vulnerabilities:** ${results.summary.criticalVulnerabilities}\n`;
  output += `- **High Vulnerabilities:** ${results.summary.highVulnerabilities}\n`;
  output += `- **Medium Vulnerabilities:** ${results.summary.mediumVulnerabilities}\n`;
  output += `- **Low Vulnerabilities:** ${results.summary.lowVulnerabilities}\n`;
  output += `- **Info Vulnerabilities:** ${results.summary.infoVulnerabilities}\n\n`;
  return output;
}

/**
 * Format risk scores section
 * 
 * @param riskScores - Risk scores data
 * @returns Formatted risk scores section
 */
function formatRiskScoresSection(riskScores: SecurityAnalysisResults['riskScores']): string {
  if (!riskScores) return '';
  
  let output = '### Risk Assessment\n\n';
  output += `- **Overall Risk Score:** ${riskScores.overallRiskScore}/100 (${riskScores.riskCategory})\n`;
  
  // Add category risk scores
  output += '\n**Risk by Category:**\n\n';
  
  const categories = Object.entries(riskScores.categoryRiskScores);
  if (categories.length > 0) {
    output += '| Category | Risk Score | Vulnerabilities | Level |\n';
    output += '|----------|------------|-----------------|-------|\n';
    
    for (const [category, data] of categories) {
      const { score, count, label } = data;
      if (count > 0) {
        output += `| ${formatCategoryName(category)} | ${score} | ${count} | ${label} |\n`;
      }
    }
    
    output += '\n';
  }
  
  return output;
}

/**
 * Format vulnerabilities section
 * 
 * @param title - Section title
 * @param vulnerabilities - Vulnerabilities array
 * @returns Formatted vulnerabilities section
 */
function formatVulnerabilitiesSection(title: string, vulnerabilities: VulnerabilityItem[]): string {
  let output = `### ${title}\n\n`;
  
  // Group vulnerabilities by severity
  const severities = ['critical', 'high', 'medium', 'low', 'info'];
  
  for (const severity of severities) {
    const vulnsWithSeverity = vulnerabilities.filter(
      v => v.severity.toLowerCase() === severity
    );
    
    if (vulnsWithSeverity.length > 0) {
      output += `#### ${capitalize(severity)} Severity (${vulnsWithSeverity.length})\n\n`;
      
      for (const vuln of vulnsWithSeverity.slice(0, 10)) { // Limit to 10 per severity
        output += formatVulnerability(vuln);
      }
      
      if (vulnsWithSeverity.length > 10) {
        output += `*...and ${vulnsWithSeverity.length - 10} more ${severity} severity issues.*\n\n`;
      }
    }
  }
  
  return output;
}

/**
 * Format a single vulnerability
 * 
 * @param vuln - Vulnerability data
 * @returns Formatted vulnerability
 */
function formatVulnerability(vuln: VulnerabilityItem): string {
  let output = '';
  
  // Format title based on vulnerability type
  if (vuln.packageName) {
    output += `**${vuln.packageName}@${vuln.installedVersion}** (${vuln.id})\n`;
  } else {
    output += `**${vuln.name}** (${vuln.id})\n`;
  }
  
  // Add common fields
  if (vuln.location) {
    output += `- **Location:** ${vuln.location.file}:${vuln.location.line || ''}\n`;
  }
  output += `- **Description:** ${vuln.description}\n`;
  output += `- **Remediation:** ${vuln.remediation}\n`;
  
  // Add source code if available
  if (vuln.sourceCode) {
    output += `- **Code:** \`${vuln.sourceCode}\`\n`;
  }
  
  output += '\n';
  return output;
}

/**
 * Format compliance reports section
 * 
 * @param complianceReports - Compliance reports data
 * @returns Formatted compliance reports section
 */
function formatComplianceReportsSection(complianceReports: ComplianceReports): string {
  let output = '### Compliance Reports\n\n';
  
  // Add PCI DSS compliance report
  if (complianceReports.pciDss) {
    output += `#### PCI DSS ${complianceReports.pciDss.version || ''}\n\n`;
    output += `**Status:** ${complianceReports.pciDss.compliant ? '✅ Compliant' : '❌ Non-compliant'}\n`;
    output += `**Summary:** ${complianceReports.pciDss.summary}\n\n`;
    
    if (complianceReports.pciDss.failedRequirements.length > 0) {
      output += '**Failed Requirements:**\n\n';
      for (const item of complianceReports.pciDss.failedRequirements.slice(0, 5)) {
        output += `- **${item.requirement.id}:** ${item.requirement.description}\n`;
      }
      
      if (complianceReports.pciDss.failedRequirements.length > 5) {
        output += `  *...and ${complianceReports.pciDss.failedRequirements.length - 5} more.*\n`;
      }
      
      output += '\n';
    }
  }
  
  // Add GDPR compliance report
  if (complianceReports.gdpr) {
    output += '#### GDPR\n\n';
    output += `**Status:** ${complianceReports.gdpr.compliant ? '✅ Compliant' : '❌ Non-compliant'}\n`;
    output += `**Summary:** ${complianceReports.gdpr.summary}\n\n`;
    
    if (complianceReports.gdpr.failedRequirements.length > 0) {
      output += '**Failed Requirements:**\n\n';
      for (const item of complianceReports.gdpr.failedRequirements.slice(0, 5)) {
        output += `- **${item.requirement.id}:** ${item.requirement.description}\n`;
      }
      
      if (complianceReports.gdpr.failedRequirements.length > 5) {
        output += `  *...and ${complianceReports.gdpr.failedRequirements.length - 5} more.*\n`;
      }
      
      output += '\n';
    }
  }
  
  // Add SOX compliance report
  if (complianceReports.sox) {
    output += '#### SOX\n\n';
    output += `**Status:** ${complianceReports.sox.compliant ? '✅ Compliant' : '❌ Non-compliant'}\n`;
    output += `**Summary:** ${complianceReports.sox.summary}\n\n`;
    
    if (complianceReports.sox.failedRequirements.length > 0) {
      output += '**Failed Requirements:**\n\n';
      for (const item of complianceReports.sox.failedRequirements.slice(0, 5)) {
        output += `- **${item.requirement.id}:** ${item.requirement.description}\n`;
      }
      
      if (complianceReports.sox.failedRequirements.length > 5) {
        output += `  *...and ${complianceReports.sox.failedRequirements.length - 5} more.*\n`;
      }
      
      output += '\n';
    }
  }
  
  return output;
}

/**
 * Format vulnerability maps section
 * 
 * @param vulnerabilityMaps - Vulnerability maps data
 * @returns Formatted vulnerability maps section
 */
function formatVulnerabilityMapsSection(
  vulnerabilityMaps: NonNullable<SecurityAnalysisResults['vulnerabilityMaps']>
): string {
  let output = '### Vulnerability Maps\n\n';
  
  // Format heatmap
  if (vulnerabilityMaps.heatmap && vulnerabilityMaps.heatmap.length > 0) {
    output += '#### Most Vulnerable Files\n\n';
    output += '| File | Vulnerabilities | Critical | High | Medium | Low |\n';
    output += '|------|-----------------|---------|------|--------|------|\n';
    
    for (const item of vulnerabilityMaps.heatmap.slice(0, 10)) {
      output += `| ${item.file} | ${item.vulnerabilityCount} | ${item.severityCounts.critical} | ${item.severityCounts.high} | ${item.severityCounts.medium} | ${item.severityCounts.low} |\n`;
    }
    
    if (vulnerabilityMaps.heatmap.length > 10) {
      output += '\n*Only showing top 10 most vulnerable files*\n';
    }
    
    output += '\n';
  }
  
  return output;
}

/**
 * Format remediation recommendations section
 * 
 * @param remediationPriority - Remediation priority data
 * @returns Formatted remediation recommendations section
 */
function formatRemediationSection(remediationPriority: RemediationItem[]): string {
  let output = '### Remediation Recommendations\n\n';
  
  output += 'The following vulnerabilities should be addressed first based on severity, exploitability, and impact:\n\n';
  
  for (let i = 0; i < Math.min(remediationPriority.length, 10); i++) {
    const vuln = remediationPriority[i];
    
    output += `${i + 1}. **[${vuln.severity.toUpperCase()}] ${vuln.name || vuln.id}** - ${vuln.remediation}\n`;
    if (vuln.location) {
      output += `   - Location: ${vuln.location.file}:${vuln.location.line || ''}\n`;
    }
  }
  
  output += '\n';
  return output;
}

/**
 * Format category name for display
 * 
 * @param category - Category key
 * @returns Formatted category name
 */
function formatCategoryName(category: string): string {
  return category
    .split('-')
    .map(capitalize)
    .join(' ');
}

/**
 * Capitalize first letter of a string
 * 
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
