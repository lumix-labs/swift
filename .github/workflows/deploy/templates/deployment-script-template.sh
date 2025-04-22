#!/bin/bash
set -e

echo "Starting deployment at $(date)"

# Check for required environment variables
if [ -z "${AWS_ECR_REGISTRY}" ]; then
  echo "Error: AWS_ECR_REGISTRY environment variable is required"
  exit 1
fi

if [ -z "${AWS_REGION}" ]; then
  echo "Error: AWS_REGION environment variable is required"
  exit 1
fi

# Create app directory if it doesn't exist
mkdir -p /app/logs/{api,web}
chmod -R 777 /app/logs

# Copy docker-compose.yml to app directory
cp docker-compose.yml /app/

# Navigate to app directory
cd /app

# Ensure Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Starting Docker service..."
  sudo systemctl start docker || true
  sleep 5
  
  # Check again if Docker is running
  if ! docker info > /dev/null 2>&1; then
    echo "Error: Failed to start Docker service"
    sudo systemctl status docker
    exit 1
  fi
fi

# Verify Docker Compose exists
if ! command -v docker-compose &> /dev/null; then
  echo "Docker Compose not found, installing..."
  if command -v apt-get &> /dev/null; then
    sudo apt-get update
    sudo apt-get install -y docker-compose
  elif command -v yum &> /dev/null; then
    sudo yum install -y docker-compose
  else
    echo "Package manager not found, installing Docker Compose using curl..."
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  fi
fi

# Login to ECR with retry logic
echo "Logging in to ECR registry ${AWS_ECR_REGISTRY}..."
MAX_ATTEMPTS=3
ATTEMPT=1

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo "Login attempt $ATTEMPT of $MAX_ATTEMPTS..."
  if aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ECR_REGISTRY}; then
    echo "Successfully logged in to ECR"
    break
  else
    echo "ECR login failed"
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
      echo "Maximum login attempts reached. Exiting."
      exit 1
    fi
  fi
  ATTEMPT=$((ATTEMPT+1))
  sleep 5
done

# Pull Docker images with individual retries
echo "Pulling Docker images..."
for service in $(docker-compose config --services); do
  echo "Pulling image for service: $service"
  MAX_PULL_ATTEMPTS=3
  PULL_ATTEMPT=1
  
  while [ $PULL_ATTEMPT -le $MAX_PULL_ATTEMPTS ]; do
    echo "Pull attempt $PULL_ATTEMPT of $MAX_PULL_ATTEMPTS for $service..."
    if docker-compose pull $service; then
      echo "Successfully pulled $service"
      break
    else
      echo "Failed to pull $service"
      if [ $PULL_ATTEMPT -eq $MAX_PULL_ATTEMPTS ]; then
        echo "Maximum pull attempts reached for $service. Will try to continue with deployment."
        # Show detailed error for the image pull failure
        REPOSITORY=$(grep -A 5 "$service:" docker-compose.yml | grep "image:" | awk '{print $2}')
        echo "Testing direct pull for $REPOSITORY:"
        docker pull $REPOSITORY || true
      fi
    fi
    PULL_ATTEMPT=$((PULL_ATTEMPT+1))
    sleep 5
  done
done

# Stop and remove existing containers
echo "Stopping existing containers..."
docker-compose down --remove-orphans || true

# Start new containers
echo "Starting new containers..."
docker-compose up -d

# Check container status
echo "Container status:"
docker-compose ps

# Verify all services are running
expected_services=$(docker-compose config --services)
running_services=""
failed_services=""

for service in $expected_services; do
  # Check if service is running
  container_id=$(docker-compose ps -q $service)
  if [ -n "$container_id" ]; then
    container_state=$(docker inspect --format='{{.State.Status}}' $container_id)
    if [ "$container_state" = "running" ]; then
      running_services="$running_services $service"
    else
      failed_services="$failed_services $service"
      echo "Service $service is not running (state: $container_state)"
    fi
  else
    failed_services="$failed_services $service"
    echo "Service $service container not found"
  fi
done

if [ -n "$failed_services" ]; then
  echo "Warning: The following services failed to start: $failed_services"
  echo "Container logs for failed services:"
  for service in $failed_services; do
    echo "--- Logs for $service ---"
    docker-compose logs $service --tail 30
  done
  echo "Deployment completed with warnings"
  exit 1
else
  echo "All containers are running successfully!"
  echo "Deployment completed successfully"
fi

echo "Deployment completed at $(date)"