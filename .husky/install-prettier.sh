#!/bin/bash

# Script to install Prettier and related dependencies in all modules
# Run this once to set up the required dependencies for line fixing

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR=$(git rev-parse --show-toplevel)
echo -e "${BLUE}🔍 Installing Prettier in all modules...${NC}"

# Install Prettier in API module
if [ -d "$ROOT_DIR/api" ] && [ -f "$ROOT_DIR/api/package.json" ]; then
  echo -e "${YELLOW}Installing Prettier in API module...${NC}"
  cd "$ROOT_DIR/api" && npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
  
  # Create/update Prettier config
  echo '{
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}' > "$ROOT_DIR/api/.prettierrc"
fi

# Install Prettier in Web module
if [ -d "$ROOT_DIR/web" ] && [ -f "$ROOT_DIR/web/package.json" ]; then
  echo -e "${YELLOW}Installing Prettier in Web module...${NC}"
  cd "$ROOT_DIR/web" && npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
  
  # Create/update Prettier config
  echo '{
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}' > "$ROOT_DIR/web/.prettierrc"
fi

# Install Prettier in MCP-Server module
if [ -d "$ROOT_DIR/mcp-server" ] && [ -f "$ROOT_DIR/mcp-server/package.json" ]; then
  echo -e "${YELLOW}Installing Prettier in MCP-Server module...${NC}"
  cd "$ROOT_DIR/mcp-server" && npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier
  
  # Create/update Prettier config
  echo '{
  "printWidth": 120,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "arrowParens": "avoid"
}' > "$ROOT_DIR/mcp-server/.prettierrc"
fi

echo -e "${GREEN}✅ Prettier installed in all modules!${NC}"
echo -e "${YELLOW}Note: You need to run this script only once to set up the required dependencies.${NC}"
exit 0
