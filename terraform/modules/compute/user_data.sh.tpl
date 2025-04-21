#!/bin/bash
set -e

# Setup logging
LOGFILE="/var/log/swift-setup.log"
exec > >(tee -a $LOGFILE) 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Swift application setup"
echo "$(date '+%Y-%m-%d %H:%M:%S') - AWS Region: ${aws_region}"

# Update packages and install Docker
echo "$(date '+%Y-%m-%d %H:%M:%S') - Updating system packages"
yum update -y || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to update packages"; exit 1; }

echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing Docker"
amazon-linux-extras install docker -y || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to install Docker"; exit 1; }

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Docker service"
systemctl start docker || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to start Docker service"; exit 1; }
systemctl enable docker || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to enable Docker service"; exit 1; }
usermod -a -G docker ec2-user || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to add ec2-user to docker group"; exit 1; }

# Install Docker Compose
echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing Docker Compose"
curl -L "https://github.com/docker/compose/releases/download/v2.16.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || { 
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to download Docker Compose"
  exit 1
}
chmod +x /usr/local/bin/docker-compose || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to set executable permissions on Docker Compose"; exit 1; }

# Install AWS CLI v2 if needed
if ! command -v aws &> /dev/null; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Installing AWS CLI v2"
  curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to download AWS CLI"
    exit 1
  }
  unzip awscliv2.zip || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to unzip AWS CLI"; exit 1; }
  ./aws/install || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to install AWS CLI"; exit 1; }
  rm -rf aws awscliv2.zip
fi

# Create directory structure
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating application directory structure"
mkdir -p /app/{web,api-server} /app/logs/{web,api-server,nginx} /app/nginx/conf.d

# Configure AWS region
aws configure set region ${aws_region} || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to configure AWS region"; exit 1; }

# Get ECR authentication
echo "$(date '+%Y-%m-%d %H:%M:%S') - Authenticating with ECR"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to get AWS account ID"
  exit 1
fi

ECR_ENDPOINT="$ACCOUNT_ID.dkr.ecr.${aws_region}.amazonaws.com"
echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR Endpoint: $ECR_ENDPOINT"

# Try ECR login with retry logic
MAX_RETRIES=3
for i in $(seq 1 $MAX_RETRIES); do
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Attempting ECR login (attempt $i/$MAX_RETRIES)"
  if aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin $ECR_ENDPOINT; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR login successful"
    break
  fi
  
  if [ $i -eq $MAX_RETRIES ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to authenticate with ECR after $MAX_RETRIES attempts"
    exit 1
  fi
  
  echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR login failed, retrying in 5 seconds..."
  sleep 5
done

# Verify container images
echo "$(date '+%Y-%m-%d %H:%M:%S') - Verifying container images"
echo "$(date '+%Y-%m-%d %H:%M:%S') - API image: ${container_image_api}"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Web image: ${container_image_web}"

[ -z "${container_image_api}" ] && { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: API container image is not specified"; exit 1; }
[ -z "${container_image_web}" ] && { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Web container image is not specified"; exit 1; }

# Create docker-compose.yml (fixed the syntax error in the web service port)
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating docker-compose.yml"
cat > /app/docker-compose.yml << EOL
version: '3'

services:
  web:
    image: ${container_image_web}
    ports:
      - "3050:3050"
    restart: always
    volumes:
      - ./logs/web:/logs
    environment:
      - NODE_ENV=production
      - PORT=3050
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3050/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - swift-network

  api-server:
    image: ${container_image_api}
    ports:
      - "4000:4000"
    restart: always
    volumes:
      - ./logs/api-server:/logs
    environment:
      - NODE_ENV=production
      - PORT=4000
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4000/healthcheck"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - swift-network

networks:
  swift-network:
    driver: bridge
EOL

# Start the application with Docker Compose
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting application with Docker Compose"
cd /app
docker-compose pull || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to pull Docker images"; exit 1; }
docker-compose up -d || { echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to start containers"; exit 1; }

# Add a health check cron job
echo "$(date '+%Y-%m-%d %H:%M:%S') - Setting up health check cron job"
cat > /etc/cron.d/docker-healthcheck << EOL
*/5 * * * * root cd /app && docker-compose ps | grep -q "Exit" && (echo "\$(date '+\%Y-\%m-\%d \%H:\%M:\%S') - Restarting containers" >> $LOGFILE; docker-compose restart) || echo "\$(date '+\%Y-\%m-\%d \%H:\%M:\%S') - Containers running normally" >> $LOGFILE
EOL
chmod 0644 /etc/cron.d/docker-healthcheck

echo "$(date '+%Y-%m-%d %H:%M:%S') - Swift application setup completed successfully"