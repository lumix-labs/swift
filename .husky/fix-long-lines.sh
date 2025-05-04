#!/bin/bash

# Script to automatically fix lines longer than 120 characters in TypeScript/JavaScript files
# This helps comply with the max-len rule in the ESLint configuration

# Color definitions
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR=$(git rev-parse --show-toplevel)
echo -e "${BLUE}🔍 Checking for lines longer than 120 characters...${NC}"

# Get the list of staged files that are TypeScript/JavaScript
FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '\.([jt]sx?|json)$')

if [ -z "$FILES" ]; then
  echo -e "${GREEN}No TypeScript/JavaScript files to check.${NC}"
  exit 0
fi

echo -e "${BLUE}Checking ${#FILES[@]} TypeScript/JavaScript files...${NC}"

# Function to fix long lines using Prettier
fix_with_prettier() {
  local module_dir="$1"
  local file_path="$2"
  local relative_path="${file_path#$ROOT_DIR/}"
  
  if [ -d "$module_dir" ]; then
    echo -e "  ${YELLOW}Fixing long lines in ${relative_path}...${NC}"
    
    # Use npx to run prettier on the file with the printWidth option
    npx --prefix "$module_dir" prettier --write --print-width 120 "$file_path"
    
    # Re-stage the file if it was modified
    git add "$file_path"
  fi
}

# Process each file
for FILE in $FILES; do
  FULL_PATH="$ROOT_DIR/$FILE"
  
  # Determine which module the file belongs to
  if [[ "$FILE" == api/* ]]; then
    fix_with_prettier "$ROOT_DIR/api" "$FULL_PATH"
  elif [[ "$FILE" == web/* ]]; then
    fix_with_prettier "$ROOT_DIR/web" "$FULL_PATH"
  elif [[ "$FILE" == mcp-server/* ]]; then
    fix_with_prettier "$ROOT_DIR/mcp-server" "$FULL_PATH"
  else
    # For files at the root level
    echo -e "  ${YELLOW}Skipping root file: $FILE${NC}"
  fi
done

echo -e "${GREEN}✅ Long line fixing complete!${NC}"
exit 0
