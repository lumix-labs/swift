#!/bin/bash
set -e

# Deploy script for EC2 instances
echo "===== Starting deployment process ====="

# Log function for better debugging
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Checking for required environment variables..."
# Check required environment variables
if [ -z "$AWS_ECR_REGISTRY" ]; then
  log "ERROR: AWS_ECR_REGISTRY is not set"
  exit 1
fi

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
  log "Installing Docker..."
  sudo apt-get update
  sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
  sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
  sudo apt-get update
  sudo apt-get install -y docker-ce
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker ubuntu
else
  log "Docker is already installed"
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
  log "Installing Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
else
  log "Docker Compose is already installed"
fi

# Create app directory if it doesn't exist
log "Setting up application directories..."
sudo mkdir -p /app/logs/{api,web}
sudo chmod -R 777 /app/logs

# Copy docker-compose.yml to app directory
log "Copying configuration files to app directory..."
sudo cp docker-compose.yml /app/

# Navigate to app directory
cd /app
log "Working directory: $(pwd)"

# Authenticate with ECR
if [ -n "$AWS_ECR_PASSWORD" ]; then
  log "Logging in to ECR..."
  echo "$AWS_ECR_PASSWORD" | docker login --username AWS --password-stdin $AWS_ECR_REGISTRY
  if [ $? -ne 0 ]; then
    log "ERROR: Failed to log in to ECR"
    exit 1
  fi
else
  log "WARNING: AWS_ECR_PASSWORD not provided, skipping ECR login"
fi

# Pull images
log "Pulling Docker images..."
docker-compose pull
if [ $? -ne 0 ]; then
  log "WARNING: Some images failed to pull, will attempt to continue"
fi

# Stop and remove existing containers
log "Stopping existing containers..."
docker-compose down || true

# Start new containers
log "Starting new containers..."
docker-compose up -d
if [ $? -ne 0 ]; then
  log "ERROR: Failed to start containers"
  exit 1
fi

# Check container status
log "Checking container status..."
docker-compose ps

# Verify service health
log "Checking service health..."
sleep 10
for service in $(docker-compose config --services); do
  container_id=$(docker-compose ps -q $service)
  if [ -z "$container_id" ]; then
    log "ERROR: Container for $service is not running"
    continue
  fi
  
  state=$(docker inspect --format='{{.State.Status}}' $container_id)
  log "Service $service is $state"
  
  if [ "$state" != "running" ]; then
    log "WARNING: Service $service is not running"
    docker logs $container_id
  fi
done

log "===== Deployment completed ====="
