#!/bin/bash
# Helper script for parsing JSON parameters in GitHub Actions workflows

set -e

# Function to safely extract a value from JSON
extract_json_value() {
  local json="$1"
  local key="$2"
  
  # Remove any newlines or carriage returns
  json=$(echo "$json" | tr -d '\n\r')
  
  # Use a simple grep approach if jq fails
  if ! value=$(echo "$json" | jq -r ".$key" 2>/dev/null); then
    # Fallback to regex pattern matching
    pattern="\"$key\"[[:space:]]*:[[:space:]]*\"([^\"]+)\""
    if [[ $json =~ $pattern ]]; then
      value="${BASH_REMATCH[1]}"
    else
      value=""
    fi
  fi
  
  echo "$value"
}

# Main function to parse infrastructure parameters
parse_infrastructure_params() {
  local params="$1"
  
  # Handle empty parameters
  if [ -z "$params" ]; then
    echo ""
    return
  fi
  
  # Extract instance IP
  extract_json_value "$params" "instance_ip"
}

# If called directly, use the first argument as JSON
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ -n "$1" ] && [ -n "$2" ]; then
    extract_json_value "$1" "$2"
  else
    echo "Usage: $0 '{\"key\":\"value\"}' 'key'"
    exit 1
  fi
fi
