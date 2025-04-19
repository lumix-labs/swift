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

// Check and create env files if they don't exist
function setupEnvFiles() {
  log(`${colors.bright}${colors.blue}Setting up environment files...${colors.reset}`);
  
  // Example env setup for each module
  const envFiles = [
    {
      module: 'api-server',
      filename: 'env.local',
      template: `PORT=3001
DATABASE_URL=mongodb://localhost:27017/swift
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
`
    },
    {
      module: 'web',
      filename: 'env.local',
      template: `NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_MCP_URL=http://localhost:3002
NODE_ENV=development
`
    },
    {
      module: 'mcp-server',
      filename: 'env.local',
      template: `PORT=3002
DATABASE_URL=mongodb://localhost:27017/swift-mcp
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
`
    }
  ];

  // Create env files if they don't exist
  envFiles.forEach(({ module, filename, template }) => {
    const envPath = path.join(rootDir, module, filename);
    
    if (!fs.existsSync(envPath)) {
      log(`Creating ${filename} for ${module}...`, colors.cyan);
      try {
        fs.writeFileSync(envPath, template);
        log(`✅ Created ${filename} for ${module}`, colors.green);
      } catch (error) {
        log(`❌ Failed to create ${filename} for ${module}: ${error.message}`, colors.red);
      }
    } else {
      log(`✅ ${filename} already exists for ${module}`, colors.green);
    }
  });
}

// Install dependencies for all modules
function installDependencies() {
  log(`${colors.bright}${colors.blue}Installing dependencies...${colors.reset}`);
  
  // Install root dependencies
  runCommand('npm install');
  
  // Install dependencies for each module
  modules.forEach(module => {
    const moduleDir = path.join(rootDir, module);
    if (fs.existsSync(path.join(moduleDir, 'package.json'))) {
      log(`Installing dependencies for ${module}...`, colors.cyan);
      runCommand('npm install', moduleDir);
    }
  });
}

// Setup git hooks
function setupGitHooks() {
  log(`${colors.bright}${colors.blue}Setting up git hooks...${colors.reset}`);
  
  // Run the husky install command
  runCommand('npx husky install');
  
  // Make hook scripts executable
  const hookFiles = [
    '.husky/pre-commit',
    '.husky/pre-push',
    '.husky/fix-eslint-errors.sh'
  ];
  
  hookFiles.forEach(hookFile => {
    const hookPath = path.join(rootDir, hookFile);
    if (fs.existsSync(hookPath)) {
      log(`Making ${hookFile} executable...`, colors.cyan);
      fs.chmodSync(hookPath, '755');
    }
  });
}

// Main function
async function main() {
  log(`${colors.bright}${colors.magenta}Setting up Swift environment...${colors.reset}`);
  
  // Setup environment files
  setupEnvFiles();
  
  // Install dependencies
  installDependencies();
  
  // Setup git hooks
  setupGitHooks();
  
  log(`${colors.bright}${colors.green}Environment setup completed!${colors.reset}`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
