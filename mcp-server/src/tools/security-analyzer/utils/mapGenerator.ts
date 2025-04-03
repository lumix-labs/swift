/**
 * Vulnerability Map Generator
 * 
 * Generates vulnerability maps for visual representation
 */

/**
 * Generate vulnerability maps for visual representation
 * 
 * @param repositoryPath - Path to the repository
 * @param codeVulnerabilities - Code vulnerabilities
 * @param securityAntiPatterns - Security anti-patterns
 * @returns Vulnerability maps
 */
export function generateVulnerabilityMaps(
  repositoryPath: string,
  codeVulnerabilities: any[],
  securityAntiPatterns: any[]
): any {
  // Create a map of files to vulnerabilities
  const fileToVulnerabilities = new Map<string, any[]>();
  
  // Add code vulnerabilities to the map
  for (const vuln of codeVulnerabilities) {
    if (!fileToVulnerabilities.has(vuln.location.file)) {
      fileToVulnerabilities.set(vuln.location.file, []);
    }
    fileToVulnerabilities.get(vuln.location.file)?.push(vuln);
  }
  
  // Add security anti-patterns to the map
  for (const pattern of securityAntiPatterns) {
    if (!fileToVulnerabilities.has(pattern.location.file)) {
      fileToVulnerabilities.set(pattern.location.file, []);
    }
    fileToVulnerabilities.get(pattern.location.file)?.push(pattern);
  }
  
  // Generate vulnerability flow maps
  const vulnerabilityFlows = generateFlowMaps(fileToVulnerabilities);
  
  // Generate vulnerability heatmap
  const heatmapData = generateHeatmapData(fileToVulnerabilities);
  
  return {
    flows: vulnerabilityFlows,
    heatmap: heatmapData
  };
}

/**
 * Generate flow maps for vulnerabilities
 * 
 * @param fileToVulnerabilities - Map of files to vulnerabilities
 * @returns Vulnerability flow maps
 */
function generateFlowMaps(fileToVulnerabilities: Map<string, any[]>): any[] {
  // In a real implementation, this would analyze code paths and data flows
  return Array.from(fileToVulnerabilities.entries())
    .map(([file, vulns]) => {
      return {
        file,
        vulnerabilities: vulns,
        entryPoints: vulns.filter(v => v.isEntryPoint),
        sinks: vulns.filter(v => v.isSink),
        flows: [] // In a real implementation, this would contain flow data
      };
    });
}

/**
 * Generate heatmap data for vulnerabilities
 * 
 * @param fileToVulnerabilities - Map of files to vulnerabilities
 * @returns Vulnerability heatmap data
 */
function generateHeatmapData(fileToVulnerabilities: Map<string, any[]>): any[] {
  return Array.from(fileToVulnerabilities.entries())
    .map(([file, vulns]) => {
      const severityCounts = {
        critical: vulns.filter(v => v.severity.toLowerCase() === 'critical').length,
        high: vulns.filter(v => v.severity.toLowerCase() === 'high').length,
        medium: vulns.filter(v => v.severity.toLowerCase() === 'medium').length,
        low: vulns.filter(v => v.severity.toLowerCase() === 'low').length,
        info: vulns.filter(v => v.severity.toLowerCase() === 'info').length
      };
      
      // Calculate heat score (weighted by severity)
      const heatScore = 
        severityCounts.critical * 10 +
        severityCounts.high * 5 +
        severityCounts.medium * 2 +
        severityCounts.low * 1;
      
      return {
        file,
        vulnerabilityCount: vulns.length,
        severityCounts,
        heatScore
      };
    })
    .sort((a, b) => b.heatScore - a.heatScore);
}
