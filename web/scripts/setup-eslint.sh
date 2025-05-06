#!/bin/bash

# Script to install and configure ESLint properly for TypeScript projects
# Run this when you're ready to fix the ESLint configuration permanently

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up proper ESLint configuration for TypeScript...${NC}"

# Install necessary dependencies
echo -e "${YELLOW}Installing TypeScript ESLint dependencies...${NC}"
npm install --save-dev \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-react \
  eslint-plugin-react-hooks

# Check if installation was successful
if [ $? -ne 0 ]; then
  echo -e "${RED}Failed to install ESLint dependencies. Please check your npm configuration.${NC}"
  exit 1
fi

# Copy the TypeScript configuration to the main ESLint config
echo -e "${YELLOW}Setting up ESLint configuration...${NC}"
cp ./eslint.typescript.config.js ./eslint.config.js

echo -e "${GREEN}✅ ESLint setup complete!${NC}"
echo "You can now run: npm run lint"
echo "Note: This setup uses ESLint's new flat config system compatible with ESLint 9.x"

exit 0
