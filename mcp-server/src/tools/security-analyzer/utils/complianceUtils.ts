/**
 * Compliance Utilities
 * 
 * Utilities for generating compliance reports
 */

import { 
  VulnerabilityItem, 
  ComplianceReports,
  ComplianceReport,
  FailedRequirement
} from '../formatters/resultFormatter';

// Interfaces needed for the functions
interface RequirementInfo {
  id: string;
  description: string;
  details: string;
}

interface RequirementMapping {
  [key: string]: RequirementInfo;
}

/**
 * Generate compliance reports for financial regulations
 * 
 * @param codeVulnerabilities - Code vulnerabilities
 * @param dependencyVulnerabilities - Dependency vulnerabilities
 * @param hardcodedCredentials - Hardcoded credentials
 * @param securityAntiPatterns - Security anti-patterns
 * @returns Compliance reports for different financial regulations
 */
export function generateComplianceReports(
  codeVulnerabilities: VulnerabilityItem[],
  dependencyVulnerabilities: VulnerabilityItem[],
  hardcodedCredentials: VulnerabilityItem[],
  securityAntiPatterns: VulnerabilityItem[]
): ComplianceReports {
  // Combine all vulnerabilities
  const allVulnerabilities = [
    ...codeVulnerabilities,
    ...dependencyVulnerabilities,
    ...hardcodedCredentials,
    ...securityAntiPatterns
  ];
  
  // Generate PCI DSS compliance report
  const pciDssReport: ComplianceReport = {
    standard: 'PCI DSS',
    version: '4.0',
    compliant: false,
    failedRequirements: [] as FailedRequirement[],
    passedRequirements: [] as FailedRequirement[],
    summary: ''
  };
  
  // Generate GDPR compliance report
  const gdprReport: ComplianceReport = {
    standard: 'GDPR',
    compliant: false,
    failedRequirements: [] as FailedRequirement[],
    passedRequirements: [] as FailedRequirement[],
    summary: ''
  };
  
  // Generate SOX compliance report
  const soxReport: ComplianceReport = {
    standard: 'SOX',
    compliant: false,
    failedRequirements: [] as FailedRequirement[],
    passedRequirements: [] as FailedRequirement[],
    summary: ''
  };
  
  // Map vulnerabilities to compliance requirements
  // This is a simplified implementation - in reality, this would be much more comprehensive
  for (const vuln of allVulnerabilities) {
    // Check for PCI DSS violations
    if (vuln.category === 'authentication' || 
        vuln.category === 'authorization' || 
        vuln.category === 'data-protection' ||
        vuln.category === 'secrets-management') {
      pciDssReport.failedRequirements.push({
        requirement: getPciRequirement(vuln),
        vulnerability: vuln
      });
    }
    
    // Check for GDPR violations
    if (vuln.category === 'data-protection' || 
        vuln.category === 'logging' ||
        vuln.category === 'privacy') {
      gdprReport.failedRequirements.push({
        requirement: getGdprRequirement(vuln),
        vulnerability: vuln
      });
    }
    
    // Check for SOX violations
    if (vuln.category === 'authentication' || 
        vuln.category === 'authorization' ||
        vuln.category === 'audit-logging') {
      soxReport.failedRequirements.push({
        requirement: getSoxRequirement(vuln),
        vulnerability: vuln
      });
    }
  }
  
  // Update compliance status
  pciDssReport.compliant = pciDssReport.failedRequirements.length === 0;
  gdprReport.compliant = gdprReport.failedRequirements.length === 0;
  soxReport.compliant = soxReport.failedRequirements.length === 0;
  
  // Generate summaries
  pciDssReport.summary = pciDssReport.compliant 
    ? 'No PCI DSS compliance issues detected'
    : `${pciDssReport.failedRequirements.length} PCI DSS compliance issues detected`;
    
  gdprReport.summary = gdprReport.compliant 
    ? 'No GDPR compliance issues detected'
    : `${gdprReport.failedRequirements.length} GDPR compliance issues detected`;
    
  soxReport.summary = soxReport.compliant 
    ? 'No SOX compliance issues detected'
    : `${soxReport.failedRequirements.length} SOX compliance issues detected`;
  
  return {
    pciDss: pciDssReport,
    gdpr: gdprReport,
    sox: soxReport
  };
}

/**
 * Get PCI DSS requirement for a vulnerability
 * 
 * @param vulnerability - Vulnerability to map to PCI DSS
 * @returns PCI DSS requirement information
 */
function getPciRequirement(vulnerability: VulnerabilityItem): RequirementInfo {
  // Map vulnerability to PCI DSS requirement
  // This is a simplified implementation - in reality, this would be much more comprehensive
  const categoryToRequirement: RequirementMapping = {
    'authentication': {
      id: '8.2',
      description: 'Use strong authentication for all users',
      details: 'Requires unique authentication credentials for all users and secure authentication mechanisms.'
    },
    'authorization': {
      id: '7.1',
      description: 'Limit access to system components',
      details: 'Access to system components and data should be limited to only those individuals whose job requires such access.'
    },
    'data-protection': {
      id: '3.4',
      description: 'Render PAN unreadable anywhere it is stored',
      details: 'Render Primary Account Numbers (PANs) unreadable using methods such as strong one-way hash functions, truncation, etc.'
    },
    'secrets-management': {
      id: '6.5.3',
      description: 'Protect credentials in code',
      details: 'Develop applications based on secure coding guidelines to protect sensitive credentials in code.'
    },
    // Default case
    'default': {
      id: '6.5',
      description: 'Address common coding vulnerabilities',
      details: 'Develop applications based on secure coding guidelines.'
    }
  };
  
  return categoryToRequirement[vulnerability.category as keyof RequirementMapping] || categoryToRequirement['default'];
}

/**
 * Get GDPR requirement for a vulnerability
 * 
 * @param vulnerability - Vulnerability to map to GDPR
 * @returns GDPR requirement information
 */
function getGdprRequirement(vulnerability: VulnerabilityItem): RequirementInfo {
  // Map vulnerability to GDPR requirement
  // This is a simplified implementation - in reality, this would be much more comprehensive
  const categoryToRequirement: RequirementMapping = {
    'data-protection': {
      id: 'Article 32',
      description: 'Security of processing',
      details: 'Implement appropriate technical and organizational measures to ensure a level of security appropriate to the risk.'
    },
    'logging': {
      id: 'Article 30',
      description: 'Records of processing activities',
      details: 'Maintain records of processing activities under its responsibility.'
    },
    'privacy': {
      id: 'Article 25',
      description: 'Data protection by design and by default',
      details: 'Implement appropriate technical and organizational measures for data protection by design and by default.'
    },
    // Default case
    'default': {
      id: 'Article 5',
      description: 'Principles relating to processing of personal data',
      details: 'Personal data shall be processed lawfully, fairly, and in a transparent manner.'
    }
  };
  
  return categoryToRequirement[vulnerability.category as keyof RequirementMapping] || categoryToRequirement['default'];
}

/**
 * Get SOX requirement for a vulnerability
 * 
 * @param vulnerability - Vulnerability to map to SOX
 * @returns SOX requirement information
 */
function getSoxRequirement(vulnerability: VulnerabilityItem): RequirementInfo {
  // Map vulnerability to SOX requirement
  // This is a simplified implementation - in reality, this would be much more comprehensive
  const categoryToRequirement: RequirementMapping = {
    'authentication': {
      id: 'Section 404',
      description: 'Access Controls',
      details: 'Implement strong access controls to financial systems and data.'
    },
    'authorization': {
      id: 'Section 404',
      description: 'Segregation of Duties',
      details: 'Ensure proper segregation of duties to prevent unauthorized access.'
    },
    'audit-logging': {
      id: 'Section 302',
      description: 'Audit Trail',
      details: 'Maintain complete audit trails for financial transactions and data modifications.'
    },
    // Default case
    'default': {
      id: 'Section 404',
      description: 'Internal Controls',
      details: 'Maintain effective internal controls over financial reporting.'
    }
  };
  
  return categoryToRequirement[vulnerability.category as keyof RequirementMapping] || categoryToRequirement['default'];
}
