#!/bin/bash
set -e

# This script ensures that husky is properly set up in Docker environments

# Navigate to the repository root
cd /workspaces/swift

# Make sure the husky directory is executable
chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push .husky/fix-eslint-errors.sh 

# Configure Git to use the husky hooks
git config --local core.hooksPath .husky

# If NPM prepare script wasn't run (which is common in Docker), run it manually
npm run prepare

echo "✅ Husky hooks have been properly configured and are ready to use."
