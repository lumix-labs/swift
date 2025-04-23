#!/bin/bash
# Helper script for parsing JSON parameters in GitHub Actions workflows

set -e

# Function to safely extract a value from JSON
extract_json_value() {
  local json="$1"
  local key="$2"
  
  echo "Attempting to extract key '$key' from JSON"
  
  # Remove any newlines or carriage returns
  json=$(echo "$json" | tr -d '\n\r')
  
  # Try different methods in order of reliability
  
  # 1. First try jq for proper JSON parsing
  if command -v jq &> /dev/null; then
    echo "Using jq for JSON parsing"
    value=$(echo "$json" | jq -r ".$key // .\"$key\" // empty" 2>/dev/null)
    if [ -n "$value" ] && [ "$value" != "null" ]; then
      echo "Successfully extracted value using jq: '$value'"
      echo "$value"
      return 0
    else
      echo "jq couldn't extract the value, falling back to regex"
    fi
  else
    echo "jq not available, using regex pattern matching"
  fi
  
  # 2. Try regex for quoted string values
  echo "Trying regex pattern for quoted string values"
  pattern="\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]+)\""
  if [[ $json =~ $pattern ]]; then
    value="${BASH_REMATCH[1]}"
    echo "Successfully extracted quoted value using regex: '$value'"
    echo "$value"
    return 0
  else
    echo "Quoted string pattern didn't match, trying alternative pattern"
  fi
  
  # 3. Try alternative pattern for non-string values
  echo "Trying regex pattern for non-string values"
  pattern="\"$key\"[[:space:]]*:[[:space:]]*([^,}\"]+"
  if [[ $json =~ $pattern ]]; then
    value="${BASH_REMATCH[1]}"
    # Clean the value (remove trailing whitespace)
    value=$(echo "$value" | xargs)
    echo "Successfully extracted non-string value using regex: '$value'"
    echo "$value"
    return 0
  else
    echo "No patterns matched for key '$key'"
  fi
  
  # 4. Return empty if no match found
  echo "Warning: Could not extract value for key '$key'"
  echo ""
}

# Main function to parse infrastructure parameters
parse_infrastructure_params() {
  local params="$1"
  local key="$2"
  
  echo "===== Infrastructure Parameter Parser ====="
  echo "Parsing key: '$key'"
  
  # Handle empty parameters
  if [ -z "$params" ]; then
    echo "Warning: Empty parameters string provided"
    echo ""
    return
  fi
  
  echo "Parameters JSON: $params"
  
  # Extract requested parameter
  value=$(extract_json_value "$params" "$key")
  
  echo "Final extracted value: '$value'"
  echo "$value"
}

# If called directly, use the first argument as JSON
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ -n "$1" ] && [ -n "$2" ]; then
    echo "===== Parameter Parser Execution ====="
    echo "Arguments: $1 $2"
    parse_infrastructure_params "$1" "$2"
  else
    echo "Usage: $0 '{\"key\":\"value\"}' 'key'"
    exit 1
  fi
fi
