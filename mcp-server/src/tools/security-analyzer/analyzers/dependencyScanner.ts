/**
 * Dependency Scanner
 *
 * Scans dependencies for known CVEs and vulnerabilities
 */
import fs from 'fs/promises';
import path from 'path';
import { logInfo } from '../../../utils/logFormatter.js';

/**
 * Interface for vulnerability definition
 */
interface Vulnerability {
  id: string;
  versions: string[];
  description: string;
  severity: string;
  link: string;
  remediation: string;
}

/**
 * Interface for detected vulnerability
 */
interface DetectedVulnerability {
  id: string;
  packageName: string;
  installedVersion: string;
  affectedVersions: string[];
  description: string;
  severity: string;
  link: string;
  remediation: string;
  location: {
    file: string;
    type: string;
  };
  category: string;
}

// Mock CVE database (in a real implementation, this would connect to a CVE database or API)
const knownVulnerabilities: Record<string, Vulnerability[]> = {
  express: [
    {
      id: 'CVE-2022-24999',
      versions: ['<4.17.3'],
      description: 'Vulnerable to Request Smuggling attacks',
      severity: 'high',
      link: 'https://nvd.nist.gov/vuln/detail/CVE-2022-24999',
      remediation: 'Upgrade to express 4.17.3 or later',
    },
  ],
  zod: [
    {
      id: 'CVE-2023-4409',
      versions: ['<3.21.4'],
      description: 'Remote attackers can cause a denial of service (uncontrolled resource consumption)',
      severity: 'medium',
      link: 'https://nvd.nist.gov/vuln/detail/CVE-2023-4409',
      remediation: 'Upgrade to zod 3.21.4 or later',
    },
  ],
  lodash: [
    {
      id: 'CVE-2021-23337',
      versions: ['<4.17.21'],
      description: 'Command injection vulnerability in zipObjectDeep function',
      severity: 'high',
      link: 'https://nvd.nist.gov/vuln/detail/CVE-2021-23337',
      remediation: 'Upgrade to lodash 4.17.21 or later',
    },
  ],
  axios: [
    {
      id: 'CVE-2023-45857',
      versions: ['<1.6.0'],
      description: 'SSRF vulnerability allows attackers to send requests to unintended destinations',
      severity: 'critical',
      link: 'https://nvd.nist.gov/vuln/detail/CVE-2023-45857',
      remediation: 'Upgrade to axios 1.6.0 or later',
    },
  ],
  moment: [
    {
      id: 'CVE-2022-31129',
      versions: ['<2.29.4'],
      description: 'Path traversal vulnerability in the locale functionality',
      severity: 'medium',
      link: 'https://nvd.nist.gov/vuln/detail/CVE-2022-31129',
      remediation: 'Upgrade to moment 2.29.4 or later',
    },
  ],
};

/**
 * Check if a version is affected by a vulnerability
 *
 * @param version - Version to check
 * @param affectedVersions - Array of affected version ranges
 * @returns Whether the version is affected
 */
function isVersionAffected(version: string, affectedVersions: string[]): boolean {
  // This is a simplified version check - in reality, this would use semver

  for (const affectedRange of affectedVersions) {
    // Handle '<X.Y.Z' format
    if (affectedRange.startsWith('<')) {
      const maxVersion = affectedRange.substring(1);
      if (compareVersions(version, maxVersion) < 0) {
        return true;
      }
    }
    // Handle '>=X.Y.Z <X.Y.Z' format
    else if (affectedRange.includes('<') && affectedRange.includes('>=')) {
      const [minPart, maxPart] = affectedRange.split(' ');
      const minVersion = minPart.substring(2);
      const maxVersion = maxPart.substring(1);
      if (compareVersions(version, minVersion) >= 0 && compareVersions(version, maxVersion) < 0) {
        return true;
      }
    }
    // Handle 'X.Y.Z' format (exact version match)
    else if (version === affectedRange) {
      return true;
    }
  }

  return false;
}

/**
 * Simple version comparison function
 *
 * @param versionA - First version
 * @param versionB - Second version
 * @returns -1 if versionA < versionB, 0 if equal, 1 if versionA > versionB
 */
function compareVersions(versionA: string, versionB: string): number {
  const partsA = versionA.split('.').map((part) => parseInt(part, 10));
  const partsB = versionB.split('.').map((part) => parseInt(part, 10));

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const partA = i < partsA.length ? partsA[i] : 0;
    const partB = i < partsB.length ? partsB[i] : 0;

    if (partA < partB) return -1;
    if (partA > partB) return 1;
  }

  return 0;
}

/**
 * Scan dependencies for vulnerabilities
 *
 * @param repositoryPath - Path to the repository
 * @param excludePaths - Paths to exclude
 * @returns Array of dependency vulnerabilities
 */
export async function scanDependenciesForCVEs(
  repositoryPath: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<DetectedVulnerability[]> {
  const vulnerabilities: DetectedVulnerability[] = [];

  try {
    // Look for package.json files
    const packageJsonPaths = await findPackageJsonFiles(repositoryPath, excludePaths);
    logInfo(`Found ${packageJsonPaths.length} package.json files`, 'security-analyzer', '1.0.0');

    for (const pkgPath of packageJsonPaths) {
      try {
        // Read and parse package.json
        const packageJson = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
        const relativeFilePath = path.relative(repositoryPath, pkgPath);

        // Check dependencies
        await checkDependencies(packageJson.dependencies || {}, vulnerabilities, relativeFilePath, 'dependencies');

        // Check dev dependencies
        await checkDependencies(
          packageJson.devDependencies || {},
          vulnerabilities,
          relativeFilePath,
          'devDependencies'
        );
      } catch (error) {
        logInfo(`Error processing package.json at ${pkgPath}: ${error}`, 'security-analyzer', '1.0.0');
      }
    }

    // Look for requirements.txt files (Python)
    // In a real implementation, this would be expanded to cover other dependency systems

    return vulnerabilities;
  } catch (error) {
    logInfo(`Error scanning dependencies: ${error}`, 'security-analyzer', '1.0.0');
    return [];
  }
}

/**
 * Find all package.json files in the repository
 *
 * @param repositoryPath - Path to the repository
 * @param excludePaths - Paths to exclude
 * @returns Array of package.json file paths
 */
async function findPackageJsonFiles(repositoryPath: string, excludePaths: string[]): Promise<string[]> {
  const result: string[] = [];

  async function scan(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip excluded paths
        if (excludePaths.some((exclude) => fullPath.includes(exclude))) {
          continue;
        }

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.name === 'package.json') {
          result.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore and continue
    }
  }

  await scan(repositoryPath);
  return result;
}

/**
 * Check dependencies for vulnerabilities
 *
 * @param dependencies - Dependencies object from package.json
 * @param vulnerabilities - Array to add found vulnerabilities to
 * @param filePath - Path to the package.json file
 * @param dependencyType - Type of dependency (dependencies or devDependencies)
 */
async function checkDependencies(
  dependencies: Record<string, string>,
  vulnerabilities: DetectedVulnerability[],
  filePath: string,
  dependencyType: string
): Promise<void> {
  for (const [name, versionSpec] of Object.entries(dependencies)) {
    // Clean up version spec - remove ^ or ~ or other modifiers
    const version = versionSpec.replace(/^[\^~]/, '');

    // Check if package has known vulnerabilities
    if (knownVulnerabilities[name]) {
      for (const vuln of knownVulnerabilities[name]) {
        if (isVersionAffected(version, vuln.versions)) {
          vulnerabilities.push({
            id: vuln.id,
            packageName: name,
            installedVersion: version,
            affectedVersions: vuln.versions,
            description: vuln.description,
            severity: vuln.severity,
            link: vuln.link,
            remediation: vuln.remediation,
            location: {
              file: filePath,
              type: dependencyType,
            },
            category: 'dependency',
          });
        }
      }
    }
  }
}
