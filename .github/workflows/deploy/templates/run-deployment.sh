#!/bin/bash
set -e

# Deployment script for Swift application
echo "Starting Swift deployment..."

# Function to log with timestamp
log_info() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1"
}

# Function to log errors with timestamp
log_error() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2
}

# Function to log warnings with timestamp
log_warn() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >&2
}

# Function to exit with error message
fail() {
  log_error "$1"
  exit 1
}

# Parse command line arguments
CONFIG_FILE=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --config)
      CONFIG_FILE="$2"
      shift 2
      ;;
    *)
      log_warn "Unknown option: $1"
      shift
      ;;
  esac
done

# Read from config file if provided
if [ -n "$CONFIG_FILE" ] && [ -f "$CONFIG_FILE" ]; then
  log_info "Reading configuration from $CONFIG_FILE"
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
log_info "Environment variables:"
env | grep -E 'AWS|CONTAINER' || true
log_info "CONTAINER_IMAGE_API: $CONTAINER_IMAGE_API"
log_info "CONTAINER_IMAGE_WEB: $CONTAINER_IMAGE_WEB"

# Check for necessary environment variables
if [ -z "$AWS_ECR_REGISTRY" ]; then
  fail "AWS_ECR_REGISTRY is required (via environment variable or config file)"
fi

if [ -z "$AWS_REGION" ]; then
  fail "AWS_REGION is required (via environment variable or config file)"
fi

log_info "Using ECR Registry: $AWS_ECR_REGISTRY"
log_info "Using AWS Region: $AWS_REGION"

# Configure AWS CLI if needed
aws configure set default.region $AWS_REGION

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
  fail "docker-compose.yml not found"
fi

# Type check parameters to detect boolean vs string confusion
log_info "Validating parameter types"
if [[ "$CONTAINER_IMAGE_API" == "true" || "$CONTAINER_IMAGE_API" == "false" ]]; then
  log_warn "CONTAINER_IMAGE_API appears to be a boolean value: '$CONTAINER_IMAGE_API'. This might indicate a type confusion in the workflow."
fi

if [[ "$CONTAINER_IMAGE_WEB" == "true" || "$CONTAINER_IMAGE_WEB" == "false" ]]; then
  log_warn "CONTAINER_IMAGE_WEB appears to be a boolean value: '$CONTAINER_IMAGE_WEB'. This might indicate a type confusion in the workflow."
fi

# Check docker-compose.yml for image references and update if needed
log_info "Checking docker-compose.yml for correct image references..."
if [ -n "$CONTAINER_IMAGE_API" ] || [ -n "$CONTAINER_IMAGE_WEB" ]; then
  log_info "Custom container images provided, ensuring they are in docker-compose.yml"
  
  # Create a backup of the original file
  cp docker-compose.yml docker-compose.yml.bak
  
  if [ -n "$CONTAINER_IMAGE_API" ]; then
    log_info "Updating api-server image to: $CONTAINER_IMAGE_API"
    # Replace the placeholder with the actual image reference
    sed -i "s|image: CONTAINER_IMAGE_API|image: $CONTAINER_IMAGE_API|g" docker-compose.yml
  fi
  
  if [ -n "$CONTAINER_IMAGE_WEB" ]; then
    log_info "Updating web image to: $CONTAINER_IMAGE_WEB"
    # Replace the placeholder with the actual image reference
    sed -i "s|image: CONTAINER_IMAGE_WEB|image: $CONTAINER_IMAGE_WEB|g" docker-compose.yml
  fi
  
  # Display updated docker-compose file
  log_info "Updated docker-compose.yml:"
  cat docker-compose.yml
fi

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
  log_info "Starting Docker service..."
  sudo systemctl start docker || true
  sleep 5
  
  # Check again if Docker is running
  if ! docker info > /dev/null 2>&1; then
    fail "Failed to start Docker service"
  fi
fi

# Login to ECR
log_info "Logging in to ECR registry..."
if ! aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ECR_REGISTRY; then
  log_error "Failed to login to ECR"
  log_info "Checking ECR connectivity..."
  aws ecr describe-repositories --region $AWS_REGION || log_error "Cannot access ECR repositories"
  fail "ECR login failed. Check AWS credentials and permissions."
fi

# Pull latest images and deploy
log_info "Pulling Docker images and starting containers..."
log_info "Running docker-compose pull..."
if ! docker-compose pull; then
  log_error "Error pulling Docker images. Retrying with more debug info..."
  # Show detailed docker pull commands
  for service in $(docker-compose config --services); do
    log_info "Examining service: $service"
    image=$(docker-compose config | grep -A 5 "$service:" | grep "image:" | awk '{print $2}' | tr -d '"')
    log_info "Service $service is using image: $image"
    log_info "Attempting direct pull: docker pull $image"
    docker pull $image || log_error "Failed to pull $image - check registry permissions and image name"
  done
  fail "Failed to pull all required Docker images"
fi

# Remove old containers and start new ones
log_info "Stopping any existing containers..."
docker-compose down || true

log_info "Starting new containers..."
if ! docker-compose up -d; then
  log_error "Failed to start containers"
  log_info "Docker-compose diagnostic information:"
  docker-compose config
  docker-compose ps
  fail "Docker-compose up failed"
fi

# Verify containers are running
log_info "Verifying container status..."
docker-compose ps

# Check actual container states
running_containers=$(docker-compose ps --services --filter "status=running" | wc -l)
expected_containers=$(docker-compose config --services | wc -l)

if [ "$running_containers" -lt "$expected_containers" ]; then
  log_warn "Not all containers are running. Check container logs for details:"
  for service in $(docker-compose config --services); do
    log_info "--- Logs for $service ---"
    docker-compose logs $service --tail 20
  done
  
  # Additional diagnostics for failed containers
  log_info "Container health check details:"
  for service in $(docker-compose config --services); do
    container_id=$(docker-compose ps -q $service)
    if [ -n "$container_id" ]; then
      log_info "Container ID for $service: $container_id"
      log_info "Container state:"
      docker inspect --format='{{.State.Status}}' $container_id
      log_info "Container health:"
      docker inspect --format='{{.State.Health.Status}}' $container_id || log_info "No health check defined"
    else
      log_warn "Container for $service not found"
    fi
  done
  
  log_error "Deployment completed with warnings"
  # Return error status
  exit 1
else
  log_info "All containers are running successfully!"
  log_info "Deployment completed successfully"
fi
