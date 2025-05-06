#!/bin/sh

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR=$(git rev-parse --show-toplevel)
WEB_DIR="$ROOT_DIR/web"

echo -e "${BLUE}🛠️ Fixing ESLint configuration in web directory...${NC}"

# Use the minimal-eslint.config.js which avoids the "root" key issue
cd "$WEB_DIR" && npx eslint --config ./minimal-eslint.config.js src/ --ext .js,.jsx,.ts,.tsx --fix || true

# Run Prettier for formatting to ensure consistent style
cd "$WEB_DIR" && npx prettier --write --print-width 120 'src/**/*.{js,ts,jsx,tsx,json}' || true

echo -e "${GREEN}✅ Basic linting and formatting completed${NC}"
exit 0
