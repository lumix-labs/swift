/**
 * Credential Scanner
 *
 * Detects hardcoded credentials, secrets, and tokens in code
 */
import path from 'path';
import { scanDirectory, readFileContent } from '../utils/fileUtils.js';
import { logInfo } from '../../../utils/logFormatter.js';

// Define patterns for credential detection
interface CredentialPattern {
  id: string;
  name: string;
  patterns: RegExp[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
}

// Define credential finding
interface CredentialFinding {
  id: string;
  name: string;
  description: string;
  severity: string;
  category: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  sourceCode: string;
  remediation: string;
}

// Define credential patterns
const credentialPatterns: CredentialPattern[] = [
  {
    id: 'API_KEY',
    name: 'API Key',
    patterns: [
      /\b(?:api|app)[-_]?(?:key|token|secret)[-_]?(?:id)?(?:\s*|=\s*|:)['"]([a-zA-Z0-9_-]{16,})(?:['"]\s*;?)/i,
    ],
    severity: 'high',
    description: 'Hardcoded API key or token detected',
    remediation: 'Use environment variables or secure credential storage',
  },
  {
    id: 'PASSWORD',
    name: 'Password',
    patterns: [/\b(?:password|passwd|pwd)(?:\s*|=\s*|:)['"](?!(?:\s*|['"]|$))([^'"]{4,64})(?:['"]\s*;?)/i],
    severity: 'critical',
    description: 'Hardcoded password detected',
    remediation: 'Use environment variables or secure credential storage',
  },
  {
    id: 'AWS_KEY',
    name: 'AWS Key',
    patterns: [
      /(?:ACCESS|SECRET)_KEY(?:_ID)?(?:\s*|=\s*|:)['"]([A-Za-z0-9/+=]{20,})(?:['"]\s*;?)/i,
      /(?:aws[_-]?(?:access|secret)[_-]?key)(?:\s*|=\s*|:)['"]([A-Za-z0-9/+=]{20,})(?:['"]\s*;?)/i,
    ],
    severity: 'critical',
    description: 'AWS access or secret key detected',
    remediation: 'Use AWS Secrets Manager or environment variables',
  },
  {
    id: 'JWT_TOKEN',
    name: 'JWT Token',
    patterns: [/eyJ[a-zA-Z0-9_-]{5,}\.eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}/],
    severity: 'high',
    description: 'JWT token detected in code',
    remediation: 'Remove hardcoded JWT token',
  },
  {
    id: 'PRIVATE_KEY',
    name: 'Private Key',
    patterns: [/-----BEGIN (?:RSA )?PRIVATE KEY-----[a-zA-Z0-9\s+/=]+-----END (?:RSA )?PRIVATE KEY-----/],
    severity: 'critical',
    description: 'Private key detected in code',
    remediation: 'Store private keys securely, not in source code',
  },
  {
    id: 'CONNECTION_STRING',
    name: 'Connection String',
    patterns: [/(?:mongodb|postgresql|mysql):\/\/[a-zA-Z0-9_]+:[^@\s'"]+@[a-zA-Z0-9_.]+/i],
    severity: 'high',
    description: 'Database connection string with credentials',
    remediation: 'Use environment variables for connection strings',
  },
];

/**
 * Detect hardcoded credentials in code
 *
 * @param repositoryPath - Path to the repository
 * @param excludePaths - Paths to exclude
 * @returns Array of detected credentials
 */
export async function detectHardcodedCredentials(
  repositoryPath: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<CredentialFinding[]> {
  try {
    // Define file extensions to scan (code files that might contain credentials)
    const fileExtensions = [
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.py',
      '.java',
      '.php',
      '.rb',
      '.c',
      '.cpp',
      '.cs',
      '.go',
      '.swift',
      '.json',
      '.yaml',
      '.yml',
      '.xml',
      '.config',
      '.ini',
      '.env',
      '.properties',
    ];

    // Scan for files to analyze
    const files = await scanDirectory(repositoryPath, excludePaths, fileExtensions);
    logInfo(`Found ${files.length} files to scan for credentials`, 'security-analyzer', '1.0.0');

    // Scan each file for credentials
    const detectedCredentials: CredentialFinding[] = [];

    for (const file of files) {
      const relativeFilePath = path.relative(repositoryPath, file);
      const content = await readFileContent(file);

      // Skip empty files
      if (!content) continue;

      // Get file content by lines for location reporting
      const lines = content.split('\n');

      // Skip files that are likely test files or examples
      if (
        relativeFilePath.includes('test/') ||
        relativeFilePath.includes('tests/') ||
        relativeFilePath.includes('example/') ||
        relativeFilePath.includes('mock')
      ) {
        // Still scan but mark as potentially lower risk
        // Implementation would depend on requirements
      }

      // Check each credential pattern
      for (const credType of credentialPatterns) {
        for (const pattern of credType.patterns) {
          // Search for pattern in file content
          const regex = new RegExp(pattern, 'g');
          let match;

          while ((match = regex.exec(content)) !== null) {
            // Find line number for the match
            let lineNumber = 0;
            let lineContent = '';
            let currentIndex = 0;

            for (let i = 0; i < lines.length; i++) {
              currentIndex += lines[i].length + 1; // +1 for newline
              if (currentIndex >= match.index) {
                lineNumber = i + 1;
                lineContent = lines[i];
                break;
              }
            }

            // Create credential finding
            // Redact the actual credentials in the report
            const cleanLineContent = lineContent.replace(match[0], (matched) => {
              // Keep the variable name but redact the actual credential
              const parts = matched.split(/['"]/);
              if (parts.length >= 3) {
                return parts[0] + "'" + '[REDACTED]' + "'";
              }
              return '[REDACTED]';
            });

            detectedCredentials.push({
              id: credType.id,
              name: credType.name,
              description: credType.description,
              severity: credType.severity,
              category: 'secrets-management',
              location: {
                file: relativeFilePath,
                line: lineNumber,
                column: lineContent.indexOf(match[0]),
              },
              sourceCode: cleanLineContent,
              remediation: credType.remediation,
            });
          }
        }
      }
    }

    return detectedCredentials;
  } catch (error) {
    logInfo(`Error scanning for credentials: ${error}`, 'security-analyzer', '1.0.0');
    return [];
  }
}
