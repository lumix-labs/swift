#!/usr/bin/env node

/**
 * GitHub Workflow Validator
 * 
 * This script checks GitHub workflow files for:
 * 1. Potential sensitive information exposure in logs
 * 2. Secure handling of secrets
 * 3. Debug statements that might leak information
 * 4. Proper OIDC authentication with AWS
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const glob = promisify(require('glob'));

const readFile = promisify(fs.readFile);
const WORKFLOWS_DIR = path.resolve(__dirname, '../../.github/workflows');

// Patterns that might indicate sensitive information exposure
const SENSITIVE_PATTERNS = [
  { 
    regex: /\becho\s+\$\{\{.*secrets\..*\}\}/i, 
    message: 'Echoing secrets directly (can expose them in logs)' 
  },
  { 
    regex: /\bcurl\s+.*(-u|--user)\s+([\w-]+:|)[^\s]+:[^\s]+@/i, 
    message: 'Embedding credentials in curl commands' 
  },
  { 
    regex: /\brun:\s+.*\$\{\{.*secrets\..*\}\}.*/i, 
    message: 'Using secrets directly in shell commands (prefer environment variables)' 
  },
  { 
    regex: /\bdebug:\s+true/i, 
    message: 'Debug mode enabled (may expose sensitive data in logs)' 
  },
  { 
    regex: /\bset-output\s+name=.*token.*value=.*secret.*/i, 
    message: 'Setting output with sensitive values (can expose them in logs)' 
  },
  { 
    regex: /\benv:\s+.*TOKEN.*\$\{\{.*secrets\..*\}\}/i, 
    message: 'Environment variable name reveals it contains a token (prefer generic names)' 
  },
  {
    regex: /console\.log\(.*secret.*\)|console\.log\(.*password.*\)|console\.log\(.*token.*\)/i,
    message: 'Logging potentially sensitive information'
  },
  {
    regex: /\baws-access-key-id\b|\baws-secret-access-key\b/i,
    message: 'Hardcoding AWS credentials action parameters (use role-to-assume instead)'
  },
  {
    regex: /TF_TOKEN_app_terraform_io/i,
    message: 'Environment variable name reveals it contains a token (prefer generic names like TF_AUTH)'
  }
];

// Best practices to check
const BEST_PRACTICES = [
  { 
    regex: /\$\{\{\s*secrets\..*\s*\}\}/, 
    inversed: true, 
    message: 'No GitHub secrets usage found - is this workflow using any authentication?' 
  },
  { 
    regex: /\bpermissions:/i, 
    inversed: true, 
    message: 'No permissions specified (follows least-privilege principle)' 
  },
  {
    regex: /id-token:\s+write/i,
    inversed: true,
    message: 'OIDC authentication not configured (id-token: write permission missing)'
  },
  {
    regex: /role-to-assume/i,
    inversed: true,
    ignoreIfNoAws: true,
    message: 'AWS authentication not using OIDC (role-to-assume not found)'
  }
];

// Load and parse .huskyignore if it exists
async function loadIgnorePatterns() {
  const huskyIgnoreFile = process.env.HUSKYIGNORE_FILE || path.resolve(__dirname, '../../.huskyignore');
  let ignorePatterns = [];

  try {
    if (fs.existsSync(huskyIgnoreFile)) {
      const content = await readFile(huskyIgnoreFile, 'utf8');
      ignorePatterns = content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
          const parts = line.split(':');
          return {
            file: parts[0].trim(),
            pattern: parts.length > 1 ? parts[1].trim() : null
          };
        });
    }
  } catch (error) {
    console.warn(`Warning: Could not load .huskyignore file: ${error.message}`);
  }

  return ignorePatterns;
}

// Check if an issue should be ignored based on .huskyignore
function shouldIgnoreIssue(issue, ignorePatterns) {
  return ignorePatterns.some(pattern => {
    // Match file path
    if (!issue.location.startsWith(pattern.file)) {
      return false;
    }
    
    // If the pattern specifies a specific issue pattern, check it
    if (pattern.pattern && issue.code) {
      return issue.code.includes(pattern.pattern);
    }
    
    // If no specific pattern, ignore all issues in this file
    return !pattern.pattern;
  });
}

async function validateWorkflow(filePath, ignorePatterns) {
  try {
    const content = await readFile(filePath, 'utf8');
    const filename = path.basename(filePath);
    const relativePath = path.relative(path.resolve(__dirname, '../..'), filePath).replace(/\\/g, '/');
    let issues = [];

    // Check for sensitive patterns
    for (const pattern of SENSITIVE_PATTERNS) {
      const matches = content.match(pattern.regex);
      if (matches) {
        const lineNumber = findLineNumber(content, matches[0]);
        const issue = {
          type: 'error',
          message: pattern.message,
          location: `${relativePath}:${lineNumber}`,
          code: matches[0].trim()
        };
        
        // Only add the issue if it's not ignored
        if (!shouldIgnoreIssue(issue, ignorePatterns)) {
          issues.push(issue);
        }
      }
    }

    // Check if file has AWS-related content
    const hasAwsContent = /aws|ecr|eks|s3|dynamodb|cloudfront|cloudformation|lambda|iam/i.test(content);

    // Check for best practices
    for (const practice of BEST_PRACTICES) {
      // Skip AWS-specific checks for non-AWS workflows
      if (practice.ignoreIfNoAws && !hasAwsContent) continue;
      
      const hasPattern = practice.regex.test(content);
      if ((practice.inversed && hasPattern) || (!practice.inversed && !hasPattern)) {
        const issue = {
          type: 'warning',
          message: practice.message,
          location: relativePath
        };
        
        // Only add the issue if it's not ignored
        if (!shouldIgnoreIssue(issue, ignorePatterns)) {
          issues.push(issue);
        }
      }
    }

    return { file: filename, relativePath, issues };
  } catch (error) {
    return { 
      file: path.basename(filePath),
      relativePath: path.relative(path.resolve(__dirname, '../..'), filePath).replace(/\\/g, '/'),
      issues: [{ type: 'error', message: `Failed to analyze: ${error.message}` }] 
    };
  }
}

function findLineNumber(content, text) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(text)) {
      return i + 1; // Line numbers start at 1, not 0
    }
  }
  return 1;
}

async function validateAllWorkflows() {
  try {
    // Load ignore patterns from .huskyignore
    const ignorePatterns = await loadIgnorePatterns();
    
    // Find all yaml files in workflows directory
    const files = await glob(`${WORKFLOWS_DIR}/**/*.{yml,yaml}`);
    
    if (files.length === 0) {
      console.log('No workflow files found.');
      return 0;
    }

    let errorCount = 0;
    let warningCount = 0;

    // Validate each workflow file
    for (const file of files) {
      const result = await validateWorkflow(file, ignorePatterns);
      
      if (result.issues.length > 0) {
        console.log(`\nIssues in ${result.file}:`);
        
        for (const issue of result.issues) {
          if (issue.type === 'error') {
            console.log(`  ❌ Error: ${issue.message}`);
            errorCount++;
          } else {
            console.log(`  ⚠️ Warning: ${issue.message}`);
            warningCount++;
          }
          
          if (issue.location) {
            console.log(`     Location: ${issue.location}`);
          }
          
          if (issue.code) {
            console.log(`     Code: ${issue.code}`);
          }
        }
      }
    }

    // Display summary
    console.log(`\nValidation complete: ${files.length} workflows checked`);
    console.log(`Found ${errorCount} errors and ${warningCount} warnings`);

    // Return non-zero exit code if errors found
    return errorCount > 0 ? 1 : 0;
  } catch (error) {
    console.error('Validation failed:', error);
    return 1;
  }
}

// Run validation
validateAllWorkflows()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
