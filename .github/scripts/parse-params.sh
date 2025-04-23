#!/bin/bash
# Helper script for parsing JSON parameters in GitHub Actions workflows

set -e

# Function to safely extract a value from JSON
extract_json_value() {
  local json="$1"
  local key="$2"
  
  # Remove any newlines or carriage returns
  json=$(echo "$json" | tr -d '\n\r')
  
  # Try different methods in order of reliability
  
  # 1. First try jq for proper JSON parsing
  if command -v jq &> /dev/null; then
    value=$(echo "$json" | jq -r ".$key // .\"$key\" // empty" 2>/dev/null)
    if [ -n "$value" ] && [ "$value" != "null" ]; then
      echo "$value"
      return 0
    fi
  fi
  
  # 2. Try regex for quoted string values
  pattern="\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]+)\""
  if [[ $json =~ $pattern ]]; then
    value="${BASH_REMATCH[1]}"
    echo "$value"
    return 0
  fi
  
  # 3. Try alternative pattern for non-string values
  pattern="\"$key\"[[:space:]]*:[[:space:]]*([^,}\"]+"
  if [[ $json =~ $pattern ]]; then
    value="${BASH_REMATCH[1]}"
    # Clean the value (remove trailing whitespace)
    value=$(echo "$value" | xargs)
    echo "$value"
    return 0
  fi
  
  # 4. Return empty if no match found
  echo ""
}

# Main function to parse infrastructure parameters
parse_infrastructure_params() {
  local params="$1"
  local key="$2"
  
  # Handle empty parameters
  if [ -z "$params" ]; then
    echo ""
    return
  fi
  
  # Extract requested parameter
  value=$(extract_json_value "$params" "$key")
  
  echo "$value"
}

# If called directly, use the first argument as JSON
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ -n "$1" ] && [ -n "$2" ]; then
    parse_infrastructure_params "$1" "$2"
  else
    echo "Usage: $0 '{\"key\":\"value\"}' 'key'"
    exit 1
  fi
fi
