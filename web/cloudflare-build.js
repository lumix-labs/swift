const { execSync } = require('child_process');

// Log function with colors
function log(message) {
  console.log(`\x1b[35m[Cloudflare Build]\x1b[0m ${message}`);
}

// Execute commands with error handling
function exec(command) {
  try {
    log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log(`Error executing: ${command}`);
    log(error.message);
    process.exit(1);
  }
}

// Main build function
function runBuild() {
  log('Starting Cloudflare Pages build process...');
  
  // Ensure we have the latest dependencies
  log('Installing dependencies...');
  exec('npm install --no-engine-strict');
  
  // Install specific dependencies that might be missing
  log('Installing Tailwind CSS dependencies...');
  exec('npm install --no-engine-strict tailwindcss postcss autoprefixer postcss-import');
  
  // Run the build
  log('Building Next.js project...');
  exec('npm run build');
  
  log('Build completed successfully! 🎉');
}

runBuild();
