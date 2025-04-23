#!/bin/bash
set -e

# Deployment script for Swift application
echo "Starting Swift deployment..."

# Parse command line arguments
CONFIG_FILE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      shift
      ;;
  esac
done

# Read from config file if provided
if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ]; then
  echo "Reading configuration from $CONFIG_FILE"
  # Use jq to parse JSON config if available, otherwise fallback to grep
  if command -v jq &> /dev/null; then
    AWS_ECR_REGISTRY=${AWS_ECR_REGISTRY:-$(jq -r '.registry // empty' "$CONFIG_FILE")}
    AWS_REGION=${AWS_REGION:-$(jq -r '.region // empty' "$CONFIG_FILE")}
    CONTAINER_IMAGE_API=${CONTAINER_IMAGE_API:-$(jq -r '.container_image_api // empty' "$CONFIG_FILE")}
    CONTAINER_IMAGE_WEB=${CONTAINER_IMAGE_WEB:-$(jq -r '.container_image_web // empty' "$CONFIG_FILE")}
  else
    # Fallback if jq is not available
    AWS_ECR_REGISTRY=${AWS_ECR_REGISTRY:-$(grep -o '"registry":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)}
    AWS_REGION=${AWS_REGION:-$(grep -o '"region":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)}
    CONTAINER_IMAGE_API=${CONTAINER_IMAGE_API:-$(grep -o '"container_image_api":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)}
    CONTAINER_IMAGE_WEB=${CONTAINER_IMAGE_WEB:-$(grep -o '"container_image_web":"[^"]*"' "$CONFIG_FILE" | cut -d'"' -f4)}
  fi
fi

# Debug information for troubleshooting
echo "Environment variables:"
env | grep AWS || true
echo "CONTAINER_IMAGE_API: $CONTAINER_IMAGE_API"
echo "CONTAINER_IMAGE_WEB: $CONTAINER_IMAGE_WEB"

# Check for necessary environment variables
if [ -z "$AWS_ECR_REGISTRY" ]; then
  echo "Error: AWS_ECR_REGISTRY is required (via environment variable or config file)"
  exit 1
fi

if [ -z "$AWS_REGION" ]; then
  echo "Error: AWS_REGION is required (via environment variable or config file)"
  exit 1
fi

echo "Using ECR Registry: $AWS_ECR_REGISTRY"
echo "Using AWS Region: $AWS_REGION"

# Configure AWS CLI if needed
aws configure set default.region $AWS_REGION

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml not found"
  exit 1
fi

# Check docker-compose.yml for image references and update if needed
echo "Checking docker-compose.yml for correct image references..."
if [ -n "$CONTAINER_IMAGE_API" ] || [ -n "$CONTAINER_IMAGE_WEB" ]; then
  echo "Custom container images provided, ensuring they are in docker-compose.yml"
  
  # Create a backup of the original file
  cp docker-compose.yml docker-compose.yml.bak
  
  if [ -n "$CONTAINER_IMAGE_API" ]; then
    echo "Updating api-server image to: $CONTAINER_IMAGE_API"
    # Replace the placeholder with the actual image reference
    sed -i "s|image: CONTAINER_IMAGE_API|image: $CONTAINER_IMAGE_API|g" docker-compose.yml
  fi
  
  if [ -n "$CONTAINER_IMAGE_WEB" ]; then
    echo "Updating web image to: $CONTAINER_IMAGE_WEB"
    # Replace the placeholder with the actual image reference
    sed -i "s|image: CONTAINER_IMAGE_WEB|image: $CONTAINER_IMAGE_WEB|g" docker-compose.yml
  fi
  
  # Display updated docker-compose file
  echo "Updated docker-compose.yml:"
  cat docker-compose.yml
fi

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Starting Docker service..."
  sudo systemctl start docker || true
  sleep 5
  
  # Check again if Docker is running
  if ! docker info > /dev/null 2>&1; then
    echo "Error: Failed to start Docker service"
    exit 1
  fi
fi

# Login to ECR
echo "Logging in to ECR registry..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ECR_REGISTRY

# Pull latest images and deploy
echo "Pulling Docker images and starting containers..."
echo "Running docker-compose pull..."
docker-compose pull || {
  echo "Error pulling Docker images. Retrying with more debug info..."
  # Show detailed docker pull commands
  for service in $(docker-compose config --services); do
    echo "Examining service: $service"
    image=$(docker-compose config | grep -A 5 "$service:" | grep "image:" | awk '{print $2}' | tr -d '"')
    echo "Service $service is using image: $image"
    echo "Attempting direct pull: docker pull $image"
    docker pull $image || echo "Failed to pull $image - check registry permissions and image name"
  done
}

# Remove old containers and start new ones
echo "Stopping any existing containers..."
docker-compose down || true

echo "Starting new containers..."
docker-compose up -d

# Verify containers are running
echo "Verifying container status..."
docker-compose ps

# Check actual container states
running_containers=$(docker-compose ps --services --filter "status=running" | wc -l)
expected_containers=$(docker-compose config --services | wc -l)

if [ "$running_containers" -lt "$expected_containers" ]; then
  echo "Warning: Not all containers are running. Check container logs for details:"
  for service in $(docker-compose config --services); do
    echo "--- Logs for $service ---"
    docker-compose logs $service --tail 20
  done
  echo "Deployment completed with warnings"
  # Return error status
  exit 1
else
  echo "All containers are running successfully!"
  echo "Deployment completed successfully"
fi
