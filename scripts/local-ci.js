#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const modules = ['api-server', 'web', 'mcp-server'];
const rootDir = path.resolve(__dirname, '..');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

// Helper to log with colors
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Run a command and return the output
function runCommandWithOutput(command, cwd = rootDir) {
  try {
    return execSync(command, { cwd, encoding: 'utf8' }).trim();
  } catch (error) {
    log(`Error executing ${command}: ${error.message}`, colors.red);
    return '';
  }
}

// Run a command and show output
function runCommand(command, cwd = rootDir) {
  try {
    log(`Running: ${command}`, colors.yellow);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Error executing ${command}: ${error.message}`, colors.red);
    return false;
  }
}

// Get the list of changed files since the last commit
function getChangedFiles() {
  // Get uncommitted changes
  const uncommittedChanges = runCommandWithOutput('git diff --name-only');
  // Get staged changes
  const stagedChanges = runCommandWithOutput('git diff --staged --name-only');
  // Combine and split into an array
  const changedFiles = [...uncommittedChanges.split('\n'), ...stagedChanges.split('\n')]
    .filter(file => file.trim() !== '');
  
  return changedFiles;
}

// Determine which modules have changed
function getChangedModules(changedFiles) {
  const changedModules = new Set();
  
  changedFiles.forEach(file => {
    // Determine which module the file belongs to
    modules.forEach(module => {
      if (file.startsWith(module + '/')) {
        changedModules.add(module);
      }
    });
    
    // Check for changes to root files (docker-compose, etc)
    if (!file.includes('/')) {
      if (file.includes('docker-compose') || file === 'package.json') {
        log(`Root file changed: ${file}`, colors.cyan);
      }
    }
  });
  
  return Array.from(changedModules);
}

// Run lint checks for a module
function runLint(module) {
  log(`\n${colors.bright}${colors.blue}Running lint for ${module}${colors.reset}`);
  
  const moduleDir = path.join(rootDir, module);
  if (!fs.existsSync(path.join(moduleDir, 'package.json'))) {
    log(`No package.json found for ${module}. Skipping lint.`, colors.yellow);
    return true;
  }
  
  // Determine lint command based on available scripts
  const packageJson = require(path.join(moduleDir, 'package.json'));
  const hasLint = packageJson.scripts && packageJson.scripts.lint;
  
  if (!hasLint) {
    log(`No lint script found for ${module}. Skipping.`, colors.yellow);
    return true;
  }
  
  return runCommand(`npm run lint`, moduleDir);
}

// Run tests for a module
function runTests(module) {
  log(`\n${colors.bright}${colors.blue}Running tests for ${module}${colors.reset}`);
  
  const moduleDir = path.join(rootDir, module);
  if (!fs.existsSync(path.join(moduleDir, 'package.json'))) {
    log(`No package.json found for ${module}. Skipping tests.`, colors.yellow);
    return true;
  }
  
  // Determine test command based on available scripts
  const packageJson = require(path.join(moduleDir, 'package.json'));
  const hasTest = packageJson.scripts && packageJson.scripts.test;
  
  if (!hasTest) {
    log(`No test script found for ${module}. Skipping.`, colors.yellow);
    return true;
  }
  
  return runCommand(`npm run test`, moduleDir);
}

// Run type checking for TypeScript modules
function runTypeCheck(module) {
  log(`\n${colors.bright}${colors.blue}Running type check for ${module}${colors.reset}`);
  
  const moduleDir = path.join(rootDir, module);
  if (!fs.existsSync(path.join(moduleDir, 'tsconfig.json'))) {
    log(`No tsconfig.json found for ${module}. Skipping type check.`, colors.yellow);
    return true;
  }
  
  return runCommand(`npx tsc --noEmit`, moduleDir);
}

// Run checks for Docker configuration if docker files changed
function checkDockerConfiguration(changedFiles) {
  const dockerFilesChanged = changedFiles.some(file => 
    file.includes('Dockerfile') || file === 'docker-compose.yml'
  );
  
  if (dockerFilesChanged) {
    log(`\n${colors.bright}${colors.blue}Checking Docker configuration${colors.reset}`);
    return runCommand('docker-compose config');
  }
  
  return true;
}

// Main function
async function main() {
  log(`${colors.bright}${colors.magenta}Running local CI checks...${colors.reset}`);
  
  // Check if git is available
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch (error) {
    log('Git is not available. This script requires git to detect changes.', colors.red);
    process.exit(1);
  }
  
  // Get changed files
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    log('No changes detected.', colors.green);
    return;
  }
  
  log(`${colors.bright}Changed files:${colors.reset}`);
  changedFiles.forEach(file => log(`  - ${file}`, colors.cyan));
  
  // Determine which modules have changes
  const changedModules = getChangedModules(changedFiles);
  
  if (changedModules.length === 0) {
    log('No module changes detected. Checking root files...', colors.yellow);
    
    // Check Docker configuration if relevant files changed
    checkDockerConfiguration(changedFiles);
    
    return;
  }
  
  log(`\n${colors.bright}Modules with changes:${colors.reset}`);
  changedModules.forEach(module => log(`  - ${module}`, colors.green));
  
  // Run checks for each changed module
  let success = true;
  
  for (const module of changedModules) {
    log(`\n${colors.bright}${colors.magenta}Running checks for ${module}${colors.reset}`);
    
    // Run linting
    if (!runLint(module)) {
      success = false;
      log(`${colors.red}Lint failed for ${module}${colors.reset}`);
    }
    
    // Run type checking
    if (!runTypeCheck(module)) {
      success = false;
      log(`${colors.red}Type checking failed for ${module}${colors.reset}`);
    }
    
    // Run tests
    if (!runTests(module)) {
      success = false;
      log(`${colors.red}Tests failed for ${module}${colors.reset}`);
    }
    
    // Build check removed as requested
  }
  
  // Check Docker configuration if relevant files changed
  if (!checkDockerConfiguration(changedFiles)) {
    success = false;
    log(`${colors.red}Docker configuration check failed${colors.reset}`);
  }
  
  // Final status
  if (success) {
    log(`\n${colors.bright}${colors.green}All checks passed successfully!${colors.reset}`);
  } else {
    log(`\n${colors.bright}${colors.red}Some checks failed. Please fix the issues before committing.${colors.reset}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
