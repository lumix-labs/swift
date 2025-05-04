/**
 * Vulnerability Scanner
 *
 * Scans code for OWASP Top 10 and CWE vulnerabilities
 */
import { scanDirectory, readFileContent } from '../utils/fileUtils.js';
import { logInfo } from '../../../utils/logFormatter.js';
import path from 'path';

/**
 * Interface for vulnerability pattern definition
 */
interface VulnerabilityPattern {
  id: string;
  name: string;
  patterns: RegExp[];
  description: string;
  remediation: string;
  severity: string;
  category: string;
  cwe: string;
}

/**
 * Interface for detected vulnerability
 */
interface DetectedVulnerability {
  id: string;
  name: string;
  description: string;
  severity: string;
  category: string;
  cwe: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  sourceCode: string;
  remediation: string;
}

// Define vulnerability patterns
const vulnerabilityPatterns: Record<string, VulnerabilityPattern[]> = {
  injection: [
    {
      id: 'CWE-89',
      name: 'SQL Injection',
      patterns: [
        /\b(?:execute|exec)\s*\(\s*['"]\s*SELECT.+\$\{?/i,
        /\bdb\.query\s*\(\s*['"]\s*[^'"]*\$\{?/i,
        /\bsql\s*=.*\+\s*req\.(?:body|params|query)/i,
      ],
      description: 'SQL injection vulnerability detected',
      remediation: 'Use parameterized queries or ORM instead of string concatenation',
      severity: 'critical',
      category: 'injection',
      cwe: 'CWE-89',
    },
    {
      id: 'CWE-79',
      name: 'Cross-site Scripting',
      patterns: [
        /\binnerHTML\s*=\s*['"]\s*[^'"]*\$\{?/i,
        /\bdocument\.write\s*\(\s*['"]\s*[^'"]*\$\{?/i,
        /\beval\s*\(/i,
      ],
      description: 'Cross-site scripting vulnerability detected',
      remediation: 'Use safe DOM APIs like textContent or sanitize input',
      severity: 'high',
      category: 'injection',
      cwe: 'CWE-79',
    },
  ],
  authentication: [
    {
      id: 'CWE-798',
      name: 'Hardcoded Credentials',
      patterns: [
        /\b(?:password|pwd|passwd)\s*=\s*['"][^'"]{3,}['"]/i,
        /\b(?:api[_-]?key|api[_-]?token)\s*=\s*['"][^'"]{5,}['"]/i,
      ],
      description: 'Hardcoded credentials detected',
      remediation: 'Use environment variables or secure credential storage',
      severity: 'critical',
      category: 'authentication',
      cwe: 'CWE-798',
    },
  ],
  authorization: [
    {
      id: 'CWE-285',
      name: 'Improper Authorization',
      patterns: [/\bif\s*\(\s*user\.isAdmin\s*\)/i, /\bauthenticated\s*=\s*true/i, /\bauth\.check\s*\(\s*\)/i],
      description: 'Potential improper authorization check',
      remediation: 'Implement proper role-based access control',
      severity: 'high',
      category: 'authorization',
      cwe: 'CWE-285',
    },
  ],
  cryptography: [
    {
      id: 'CWE-327',
      name: 'Weak Cryptography',
      patterns: [
        /\bcreateHash\s*\(\s*['"]md5['"]/i,
        /\bcrypto\.createCipher\s*\(/i,
        /\bcreateHash\s*\(\s*['"]sha1['"]/i,
      ],
      description: 'Use of weak cryptographic algorithm',
      remediation: 'Use modern algorithms like SHA-256 or better',
      severity: 'high',
      category: 'cryptography',
      cwe: 'CWE-327',
    },
  ],
  'data-protection': [
    {
      id: 'CWE-312',
      name: 'Cleartext Storage of Sensitive Information',
      patterns: [
        /\bfs\.writeFile\s*\([^,]*,\s*[^,]*password/i,
        /\bconsole\.log\s*\([^)]*password/i,
        /\bconsole\.log\s*\([^)]*secret/i,
      ],
      description: 'Sensitive information written in cleartext',
      remediation: 'Encrypt sensitive data before storage or logging',
      severity: 'high',
      category: 'data-protection',
      cwe: 'CWE-312',
    },
  ],
  'input-validation': [
    {
      id: 'CWE-20',
      name: 'Improper Input Validation',
      patterns: [
        /\brequire\s*\(\s*req\.(?:body|params|query)\./i,
        /\bnew\s+Function\s*\(\s*[^)]*req\.(?:body|params|query)/i,
        /\bchild_process\.exec\s*\(\s*[^)]*req\.(?:body|params|query)/i,
      ],
      description: 'Missing input validation',
      remediation: 'Validate and sanitize all user inputs',
      severity: 'high',
      category: 'input-validation',
      cwe: 'CWE-20',
    },
  ],
};

/**
 * Language-specific file extensions
 */
const languageExtensions: Record<string, string[]> = {
  javascript: ['.js', '.jsx', '.mjs'],
  typescript: ['.ts', '.tsx'],
  python: ['.py'],
  java: ['.java'],
  csharp: ['.cs'],
  php: ['.php'],
  ruby: ['.rb'],
};

/**
 * Scan for security vulnerabilities in code
 *
 * @param repositoryPath - Path to the repository
 * @param framework - Framework or language (optional)
 * @param excludePaths - Paths to exclude
 * @returns Array of detected vulnerabilities
 */
export async function scanForVulnerabilities(
  repositoryPath: string,
  framework?: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<DetectedVulnerability[]> {
  try {
    // Determine which file extensions to scan based on framework/language
    let fileExtensions: string[] = [];
    if (framework) {
      switch (framework.toLowerCase()) {
        case 'node':
        case 'javascript':
        case 'js':
          fileExtensions = languageExtensions['javascript'];
          break;
        case 'typescript':
        case 'ts':
          fileExtensions = languageExtensions['typescript'];
          break;
        case 'python':
        case 'django':
        case 'flask':
          fileExtensions = languageExtensions['python'];
          break;
        // Add more frameworks/languages as needed
        default:
          // Default to popular web languages
          fileExtensions = [
            ...languageExtensions['javascript'],
            ...languageExtensions['typescript'],
            ...languageExtensions['python'],
            ...languageExtensions['php'],
          ];
      }
    } else {
      // If no framework specified, scan common languages
      fileExtensions = [
        ...languageExtensions['javascript'],
        ...languageExtensions['typescript'],
        ...languageExtensions['python'],
        ...languageExtensions['php'],
        ...languageExtensions['java'],
        ...languageExtensions['ruby'],
      ];
    }

    // Scan for files to analyze
    const files = await scanDirectory(repositoryPath, excludePaths, fileExtensions);
    logInfo(`Found ${files.length} files to scan for vulnerabilities`, 'security-analyzer', '1.0.0');

    // Scan each file for vulnerabilities
    const vulnerabilities: DetectedVulnerability[] = [];

    for (const file of files) {
      const relativeFilePath = path.relative(repositoryPath, file);
      const content = await readFileContent(file);

      // Skip empty files
      if (!content) continue;

      // Get file content by lines for location reporting
      const lines = content.split('\n');

      // Check each vulnerability pattern
      for (const category in vulnerabilityPatterns) {
        for (const vulnType of vulnerabilityPatterns[category]) {
          for (const pattern of vulnType.patterns) {
            // Search for pattern in file content
            const matches = content.match(new RegExp(pattern, 'g'));

            if (matches) {
              // Find line numbers for each match
              for (const match of matches) {
                let lineNumber = 0;
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i].includes(match)) {
                    lineNumber = i + 1;
                    break;
                  }
                }

                // Add vulnerability to results
                vulnerabilities.push({
                  id: vulnType.id,
                  name: vulnType.name,
                  description: vulnType.description,
                  severity: vulnType.severity,
                  category: vulnType.category,
                  cwe: vulnType.cwe,
                  location: {
                    file: relativeFilePath,
                    line: lineNumber,
                    column: lines[lineNumber - 1]?.indexOf(match) || 0,
                  },
                  sourceCode: lines[lineNumber - 1]?.trim() || '',
                  remediation: vulnType.remediation,
                });
              }
            }
          }
        }
      }
    }

    return vulnerabilities;
  } catch (error) {
    logInfo(`Error scanning for vulnerabilities: ${error}`, 'security-analyzer', '1.0.0');
    return [];
  }
}
