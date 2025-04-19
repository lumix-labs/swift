/**
 * Security Anti-Pattern Scanner
 * 
 * Detects security anti-patterns in code
 */
import path from 'path';
import { scanDirectory, readFileContent } from '../utils/fileUtils.js';
import { logInfo } from '../../../utils/logFormatter.js';

/**
 * Interface for security anti-pattern definition
 */
interface SecurityAntiPattern {
  id: string;
  name: string;
  patterns: RegExp[];
  description: string;
  remediation: string;
  severity: string;
  category: string;
}

/**
 * Interface for detected anti-pattern
 */
interface DetectedAntiPattern {
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
  isEntryPoint: boolean;
  isSink: boolean;
}

// Define security anti-patterns
const securityAntiPatterns: Record<string, SecurityAntiPattern[]> = {
  'javascript': [
    {
      id: 'INSECURE_CORS',
      name: 'Insecure CORS Configuration',
      patterns: [
        /cors\(\{\s*origin\s*:\s*(?:['"]?\*['"]?|\[['"]?\*['"]?\])/i,
        /Access-Control-Allow-Origin:\s*\*/i
      ],
      description: 'Overly permissive CORS configuration',
      remediation: 'Restrict CORS to specific trusted origins',
      severity: 'medium',
      category: 'configuration'
    },
    {
      id: 'INSECURE_COOKIE',
      name: 'Insecure Cookie Configuration',
      patterns: [
        /cookie\([^)]*\{\s*(?:[^}]*,\s*)?secure\s*:\s*false/i,
        /cookie\([^)]*\{\s*(?:[^}]*,\s*)?httpOnly\s*:\s*false/i
      ],
      description: 'Cookies configured without secure or httpOnly flags',
      remediation: 'Set secure and httpOnly flags on cookies',
      severity: 'medium',
      category: 'session-management'
    },
    {
      id: 'UNSAFE_EVAL',
      name: 'Use of Unsafe eval()',
      patterns: [
        /\beval\s*\(/i,
        /new\s+Function\s*\(/i
      ],
      description: 'Use of eval() or Function constructor',
      remediation: 'Avoid using eval() or new Function()',
      severity: 'high',
      category: 'code-injection'
    },
    {
      id: 'UNSAFE_DESERIALIZATION',
      name: 'Unsafe Deserialization',
      patterns: [
        /require\(['"]js-yaml['"]\)\.load\(/i,
        /yaml\.load\(/i,
        /JSON\.parse\(\s*(?:req|request)\.(?:body|params|query)/i
      ],
      description: 'Unsafe deserialization of user-controlled input',
      remediation: 'Validate and sanitize input before deserialization',
      severity: 'high',
      category: 'deserialization'
    }
  ],
  'node': [
    {
      id: 'NO_HELMET',
      name: 'Missing Security Headers',
      patterns: [
        /app\s*=\s*express\(\)(?:\s*;)?(?:[\s\S]{0,500}?)(?!app\.use\(helmet)/i
      ],
      description: 'Express app without Helmet security headers',
      remediation: 'Use Helmet.js to set security headers',
      severity: 'medium',
      category: 'configuration'
    },
    {
      id: 'UNSAFE_EXEC',
      name: 'Unsafe exec/spawn',
      patterns: [
        /(?:child_process|exec|spawn|execSync)\s*\(\s*(?:(?:['"`][\s\S]*?\$\{)|(?:[^'"`][\s\S]{0,50}(?:req|request)\.(?:body|params|query)))/i
      ],
      description: 'Command injection risk in child_process usage',
      remediation: 'Avoid using child_process with user input',
      severity: 'critical',
      category: 'command-injection'
    },
    {
      id: 'TIMING_ATTACK',
      name: 'Timing Attack Vulnerability',
      patterns: [
        /(?:===|!==|==|!=)\s*(?:password|token|secret)/i
      ],
      description: 'Vulnerable to timing attacks when comparing secrets',
      remediation: 'Use crypto.timingSafeEqual() for secret comparison',
      severity: 'medium',
      category: 'cryptography'
    }
  ],
  'python': [
    {
      id: 'UNSAFE_YAML',
      name: 'Unsafe YAML Load',
      patterns: [
        /yaml\.load\(/i
      ],
      description: 'Use of unsafe yaml.load() instead of yaml.safe_load()',
      remediation: 'Use yaml.safe_load() instead',
      severity: 'high',
      category: 'deserialization'
    },
    {
      id: 'UNSAFE_PICKLE',
      name: 'Unsafe Pickle Usage',
      patterns: [
        /pickle\.loads?\(/i
      ],
      description: 'Use of unsafe pickle deserialization',
      remediation: 'Avoid using pickle with untrusted data',
      severity: 'high',
      category: 'deserialization'
    },
    {
      id: 'SHELL_INJECTION',
      name: 'Shell Injection Risk',
      patterns: [
        /os\.system\s*\(\s*(?:f['"`]|['"`][\s\S]*?\{)/i,
        /subprocess\.(?:call|run|Popen)\s*\(\s*(?:f['"`]|['"`][\s\S]*?\{)/i,
        /os\.popen\s*\(/i,
        /exec\s*\(/i
      ],
      description: 'Shell injection risk in subprocess/os.system calls',
      remediation: 'Use subprocess with shell=False and pass arguments as array',
      severity: 'critical',
      category: 'command-injection'
    }
  ]
};

/**
 * Analyze security anti-patterns in code
 * 
 * @param repositoryPath - Path to the repository
 * @param framework - Framework or language (optional)
 * @param excludePaths - Paths to exclude
 * @returns Array of detected anti-patterns
 */
export async function analyzeSecurityAntiPatterns(
  repositoryPath: string,
  framework?: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<DetectedAntiPattern[]> {
  try {
    // Determine which patterns to check based on framework/language
    let patternsToCheck: SecurityAntiPattern[][] = [];
    
    if (framework) {
      // Check for specific framework patterns
      if (securityAntiPatterns[framework.toLowerCase()]) {
        patternsToCheck.push(securityAntiPatterns[framework.toLowerCase()]);
      }
      
      // Add JavaScript patterns for Node.js and frontend frameworks
      if (['node', 'express', 'react', 'angular', 'vue'].includes(framework.toLowerCase())) {
        patternsToCheck.push(securityAntiPatterns['javascript']);
      }
    } else {
      // If no framework specified, check all patterns
      patternsToCheck = Object.values(securityAntiPatterns);
    }
    
    // Flatten patterns array
    const allPatterns = patternsToCheck.flat();
    
    // Determine file extensions to scan
    const fileExtensions = getFileExtensions(framework);
    
    // Scan for files to analyze
    const files = await scanDirectory(repositoryPath, excludePaths, fileExtensions);
    logInfo(`Found ${files.length} files to scan for security anti-patterns`, 'security-analyzer', '1.0.0');
    
    // Scan each file for anti-patterns
    const detectedPatterns: DetectedAntiPattern[] = [];
    
    for (const file of files) {
      const relativeFilePath = path.relative(repositoryPath, file);
      const content = await readFileContent(file);
      
      // Skip empty files
      if (!content) continue;
      
      // Get file content by lines for location reporting
      const lines = content.split('\n');
      
      // Check each anti-pattern
      for (const antiPattern of allPatterns) {
        for (const pattern of antiPattern.patterns) {
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
            
            // Add anti-pattern to results
            detectedPatterns.push({
              id: antiPattern.id,
              name: antiPattern.name,
              description: antiPattern.description,
              severity: antiPattern.severity,
              category: antiPattern.category,
              location: {
                file: relativeFilePath,
                line: lineNumber,
                column: lineContent.indexOf(match[0])
              },
              sourceCode: lineContent.trim(),
              remediation: antiPattern.remediation,
              isEntryPoint: isEntryPoint(antiPattern.category),
              isSink: isSink(antiPattern.category)
            });
          }
        }
      }
    }
    
    return detectedPatterns;
  } catch (error) {
    logInfo(`Error scanning for security anti-patterns: ${error}`, 'security-analyzer', '1.0.0');
    return [];
  }
}

/**
 * Get file extensions based on framework/language
 * 
 * @param framework - Framework or language
 * @returns Array of file extensions to scan
 */
function getFileExtensions(framework?: string): string[] {
  if (!framework) {
    // Scan all common file types
    return [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.php', '.rb', '.java', '.go', '.cs'
    ];
  }
  
  // Framework-specific extensions
  switch (framework.toLowerCase()) {
    case 'node':
    case 'express':
    case 'javascript':
      return ['.js', '.jsx', '.mjs', '.cjs'];
    case 'typescript':
    case 'angular':
      return ['.ts', '.tsx'];
    case 'react':
      return ['.js', '.jsx', '.ts', '.tsx'];
    case 'vue':
      return ['.js', '.vue'];
    case 'python':
    case 'django':
    case 'flask':
      return ['.py'];
    case 'php':
    case 'laravel':
    case 'symfony':
      return ['.php'];
    case 'ruby':
    case 'rails':
      return ['.rb'];
    case 'java':
    case 'spring':
      return ['.java'];
    case 'csharp':
    case 'dotnet':
      return ['.cs'];
    default:
      // Default to most common types
      return ['.js', '.jsx', '.ts', '.tsx', '.py', '.php'];
  }
}

/**
 * Determines if a vulnerability category is typically an entry point
 * 
 * @param category - Vulnerability category
 * @returns Whether the category is an entry point
 */
function isEntryPoint(category: string): boolean {
  return ['input-validation', 'deserialization', 'request-validation'].includes(category);
}

/**
 * Determines if a vulnerability category is typically a sink
 * 
 * @param category - Vulnerability category
 * @returns Whether the category is a sink
 */
function isSink(category: string): boolean {
  return ['code-injection', 'command-injection', 'sql-injection', 'xss'].includes(category);
}
