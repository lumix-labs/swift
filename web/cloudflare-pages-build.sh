#!/bin/bash

# Print commands before executing them
set -x

# Exit on error
set -e

echo "===== Starting Cloudflare Pages build script ====="

# Move to the web directory
cd "$(dirname "$0")"

# Install dependencies with npm install instead of npm ci
echo "===== Installing dependencies ====="
npm install --no-engine-strict

# Install specific TailwindCSS dependencies
echo "===== Installing Tailwind CSS dependencies ====="
npm install --no-engine-strict tailwindcss@3.4.1 postcss@8.4.38 autoprefixer@10.4.19 postcss-import@16.0.1

# Generate the lock file
echo "===== Updating lock file ====="
npm install --package-lock-only

# Run the build
echo "===== Building Next.js project ====="
npm run build

echo "===== Build completed successfully! ====="
