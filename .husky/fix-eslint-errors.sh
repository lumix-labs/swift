#!/bin/bash

ROOT_DIR=$(git rev-parse --show-toplevel)

# Color definitions for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fix common issues in API
if [ -d "$ROOT_DIR/api/src" ]; then
  echo -e "${BLUE}Fixing common issues in API...${NC}"
  
  # Run ESLint with auto-fix
  if [ -f "$ROOT_DIR/api/package.json" ]; then
    echo -e "${YELLOW}Running ESLint auto-fix for API...${NC}"
    cd "$ROOT_DIR/api" && npx eslint --fix 'src/**/*.{js,ts}'
  fi
  
  # Run Prettier to fix formatting including line length
  if [ -f "$ROOT_DIR/api/package.json" ]; then
    echo -e "${YELLOW}Running Prettier for API to fix formatting and line length...${NC}"
    cd "$ROOT_DIR/api" && npx prettier --write --print-width 120 'src/**/*.{js,ts,json}'
  fi
fi

# Fix common issues in Web
if [ -d "$ROOT_DIR/web/src" ]; then
  echo -e "${BLUE}Fixing common issues in Web...${NC}"
  
  # Run ESLint with auto-fix
  if [ -f "$ROOT_DIR/web/package.json" ]; then
    echo -e "${YELLOW}Running ESLint auto-fix for Web...${NC}"
    cd "$ROOT_DIR/web" && npx eslint --fix 'src'
  fi
  
  # Run Prettier to fix formatting including line length
  if [ -f "$ROOT_DIR/web/package.json" ]; then
    echo -e "${YELLOW}Running Prettier for Web to fix formatting and line length...${NC}"
    cd "$ROOT_DIR/web" && npx prettier --write --print-width 120 'src/**/*.{js,ts,jsx,tsx,json}'
  fi
fi

# Fix common issues in MCP-Server
if [ -d "$ROOT_DIR/mcp-server/src" ]; then
  echo -e "${BLUE}Fixing common issues in MCP-Server...${NC}"
  
  # Run ESLint with auto-fix
  if [ -f "$ROOT_DIR/mcp-server/package.json" ]; then
    echo -e "${YELLOW}Running ESLint auto-fix for MCP-Server...${NC}"
    cd "$ROOT_DIR/mcp-server" && npx eslint --fix 'src/**/*.{js,ts}'
  fi
  
  # Run Prettier to fix formatting including line length
  if [ -f "$ROOT_DIR/mcp-server/package.json" ]; then
    echo -e "${YELLOW}Running Prettier for MCP-Server to fix formatting and line length...${NC}"
    cd "$ROOT_DIR/mcp-server" && npx prettier --write --print-width 120 'src/**/*.{js,ts,json}'
  fi
fi

# Re-add all changed files back to staging
git diff --name-only | xargs git add

echo -e "${GREEN}ESLint errors fixed!${NC}"
