#!/bin/bash
set -e

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  sudo apt-get update
  sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
  sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
  sudo apt-get update
  sudo apt-get install -y docker-ce
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker ubuntu
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
  echo "Installing Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

# Create app directory if it doesn't exist
sudo mkdir -p /app/logs/{api,web}
sudo chmod -R 777 /app/logs

# Copy docker-compose.yml to app directory
sudo cp docker-compose.yml /app/

# Navigate to app directory
cd /app

# Authenticate with ECR
if [ -n "$AWS_ECR_PASSWORD" ]; then
  echo "Logging in to ECR..."
  echo "$AWS_ECR_PASSWORD" | docker login --username AWS --password-stdin $AWS_ECR_REGISTRY
fi

# Pull images
echo "Pulling Docker images..."
docker-compose pull

# Stop and remove existing containers
echo "Stopping existing containers..."
docker-compose down || true

# Start new containers
echo "Starting new containers..."
docker-compose up -d

# Check container status
echo "Checking container status..."
docker-compose ps
