#!/bin/bash
set -e

# Deployment script for Swift application
echo "Starting Swift deployment..."

# Check for necessary environment variables
if [ -z "$AWS_ECR_REGISTRY" ]; then
  echo "Error: AWS_ECR_REGISTRY environment variable is required"
  exit 1
fi

if [ -z "$AWS_REGION" ]; then
  echo "Error: AWS_REGION environment variable is required"
  exit 1
fi

# Configure AWS CLI if needed
aws configure set default.region $AWS_REGION

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
  echo "Error: docker-compose.yml not found"
  exit 1
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
docker-compose pull || {
  echo "Error pulling Docker images. Retrying with more debug info..."
  # Retry with more debug information
  for service in $(docker-compose config --services); do
    echo "Pulling image for service: $service"
    docker-compose pull $service || echo "Failed to pull $service - continuing with other services"
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
running_containers=$(docker-compose ps --services | wc -l)
expected_containers=$(docker-compose config --services | wc -l)

if [ "$running_containers" -lt "$expected_containers" ]; then
  echo "Warning: Not all containers are running. Check container logs for details:"
  for service in $(docker-compose config --services); do
    echo "--- Logs for $service ---"
    docker-compose logs $service --tail 20
  done
  echo "Deployment completed with warnings"
else
  echo "All containers are running successfully!"
  echo "Deployment completed successfully"
fi
