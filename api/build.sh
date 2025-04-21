#!/bin/bash
set -e

# Navigate to script directory
cd "$(dirname "$0")"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build TypeScript code
echo "Building TypeScript code..."
npm run build

echo "Build completed successfully!"
