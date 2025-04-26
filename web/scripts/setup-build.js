const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log function for clarity
function log(message) {
  console.log(`\x1b[36m[Setup]\x1b[0m ${message}`);
}

// Execute commands and handle errors
function exec(command) {
  try {
    log(`Executing: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Error executing: ${command}`);
    log(error.message);
    return false;
  }
}

// Main function
function setupBuild() {
  log('Starting build setup for Cloudflare Pages...');
  
  // Required dependencies
  const requiredDeps = [
    'tailwindcss',
    'postcss',
    'autoprefixer',
    'postcss-import'
  ];
  
  // Check if packages are installed
  let needsInstall = false;
  for (const dep of requiredDeps) {
    try {
      require.resolve(dep);
      log(`✅ ${dep} is installed`);
    } catch (e) {
      log(`❌ ${dep} is missing`);
      needsInstall = true;
    }
  }
  
  // Install missing packages if needed
  if (needsInstall) {
    log('Installing missing dependencies...');
    exec('npm install --no-engine-strict tailwindcss postcss autoprefixer postcss-import');
  }
  
  // Ensure output directory exists
  const outDir = path.join(__dirname, '..', 'out');
  if (!fs.existsSync(outDir)) {
    log('Creating output directory...');
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  log('Setup complete! Ready to build.');
}

// Run the setup
setupBuild();
