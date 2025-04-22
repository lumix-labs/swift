#!/bin/bash
set -e

echo "Starting deployment at $(date)"

# Check for required environment variables
if [ -z "${AWS_ECR_REGISTRY}" ]; then
  echo "Error: AWS_ECR_REGISTRY environment variable is required"
  exit 1
fi
