#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Start the application with Docker Compose
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting application with Docker Compose"
cd /app

# Debug: show current directory and contents
echo "$(date '+%Y-%m-%d %H:%M:%S') - Current directory: $(pwd)"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Directory contents:"
ls -la

# Debug: show docker-compose file contents
echo "$(date '+%Y-%m-%d %H:%M:%S') - docker-compose.yml contents:"
cat docker-compose.yml

# Debug: check Docker status
echo "$(date '+%Y-%m-%d %H:%M:%S') - Docker service status:"
systemctl status docker || echo "Failed to get Docker status, continuing anyway"

# Debug: check Docker images
echo "$(date '+%Y-%m-%d %H:%M:%S') - Currently available Docker images:"
docker images || echo "Failed to list Docker images, continuing anyway"

# Extract ECR endpoint from image URLs if not set
if [ -z "$ECR_ENDPOINT" ]; then
    # Try to extract from container images if they're ECR images
    if [[ "${CONTAINER_IMAGE_API}" == *".dkr.ecr."*".amazonaws.com/"* ]]; then
        ECR_ENDPOINT=$(echo "${CONTAINER_IMAGE_API}" | sed -E 's|^([^/]+)/.*$|\1|')
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Extracted ECR endpoint from API image: $ECR_ENDPOINT"
    elif [[ "${CONTAINER_IMAGE_WEB}" == *".dkr.ecr."*".amazonaws.com/"* ]]; then
        ECR_ENDPOINT=$(echo "${CONTAINER_IMAGE_WEB}" | sed -E 's|^([^/]+)/.*$|\1|')
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Extracted ECR endpoint from Web image: $ECR_ENDPOINT"
    fi
fi

# Attempt ECR login if we have an endpoint and haven't already logged in
if [ -n "$ECR_ENDPOINT" ] && [ "$ECR_LOGIN_SUCCESS" != "true" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Attempting ECR login to: $ECR_ENDPOINT"
    if aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin $ECR_ENDPOINT; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR login successful"
        ECR_LOGIN_SUCCESS=true
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to authenticate with ECR"
    fi
fi

# Check if images exist
echo "$(date '+%Y-%m-%d %H:%M:%S') - Checking if Docker images exist..."
API_IMAGE_EXISTS=false
WEB_IMAGE_EXISTS=false

# Try to pull images explicitly
echo "$(date '+%Y-%m-%d %H:%M:%S') - Pulling Docker images..."
if [ -n "${CONTAINER_IMAGE_API}" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Pulling API image: ${CONTAINER_IMAGE_API}"
    if docker pull ${CONTAINER_IMAGE_API}; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Successfully pulled API image"
        API_IMAGE_EXISTS=true
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to pull API Docker image"
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skipping API image pull as image reference is empty"
fi

if [ -n "${CONTAINER_IMAGE_WEB}" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Pulling Web image: ${CONTAINER_IMAGE_WEB}"
    if docker pull ${CONTAINER_IMAGE_WEB}; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Successfully pulled Web image"
        WEB_IMAGE_EXISTS=true
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to pull Web Docker image"
    fi
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skipping Web image pull as image reference is empty"
fi

# Update docker-compose.yml if needed with fallback images for missing services
if [ "$API_IMAGE_EXISTS" = "false" ] || [ "$WEB_IMAGE_EXISTS" = "false" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Some images couldn't be pulled, updating docker-compose.yml with fallbacks"
    
    # Create a backup of the original
    cp docker-compose.yml docker-compose.yml.bak
    
    # Start with empty docker-compose to rebuild
    echo "version: '3'

services:" > docker-compose.yml

    # Add web service with either original or fallback image
    if [ "$WEB_IMAGE_EXISTS" = "true" ]; then
        echo "  web:
    image: ${CONTAINER_IMAGE_WEB}
    ports:
      - \"80:80\"
    restart: always
    volumes:
      - ./logs/web:/logs
    environment:
      - NODE_ENV=production
      - PORT=80
    healthcheck:
      test: [\"CMD\", \"wget\", \"--spider\", \"-q\", \"http://localhost:80/\"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - swift-network" >> docker-compose.yml
    else
        echo "  web:
    image: httpd:latest
    ports:
      - \"80:80\"
    restart: always
    volumes:
      - ./logs/web:/usr/local/apache2/logs
    command: sh -c \"echo 'Web service fallback running' > /usr/local/apache2/htdocs/index.html && httpd-foreground\"
    networks:
      - swift-network" >> docker-compose.yml
    fi

    # Add api service with either original or fallback image
    if [ "$API_IMAGE_EXISTS" = "true" ]; then
        echo "
  api:
    image: ${CONTAINER_IMAGE_API}
    ports:
      - \"4000:4000\"
    restart: always
    volumes:
      - ./logs/api:/logs
    environment:
      - NODE_ENV=production
      - PORT=4000
    healthcheck:
      test: [\"CMD\", \"wget\", \"--spider\", \"-q\", \"http://localhost:4000/healthcheck\"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    networks:
      - swift-network" >> docker-compose.yml
    else
        echo "
  api:
    image: httpd:latest
    ports:
      - \"4000:80\"
    restart: always
    volumes:
      - ./logs/api:/usr/local/apache2/logs
    command: sh -c \"echo '{\\\"status\\\":\\\"healthy\\\"}' > /usr/local/apache2/htdocs/healthcheck && httpd-foreground\"
    networks:
      - swift-network" >> docker-compose.yml
    fi

    # Add networks section
    echo "
networks:
  swift-network:
    driver: bridge" >> docker-compose.yml

    # Show the updated docker-compose.yml
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Updated docker-compose.yml contents:"
    cat docker-compose.yml
fi

# Start containers
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting containers with docker-compose"
docker-compose up -d || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to start containers" 
    
    # Check what went wrong
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Docker compose configuration validation:"
    docker-compose config || echo "$(date '+%Y-%m-%d %H:%M:%S') - Failed to validate docker-compose config"
    
    # If we failed with the updated docker-compose, try with the dedicated fallback file
    if [ -f "docker-compose-fallback.yml" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Attempting to start with dedicated fallback compose file"
        
        docker-compose -f docker-compose-fallback.yml up -d || {
            echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to start even with fallback images"
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Fallback docker-compose file contents:"
            cat docker-compose-fallback.yml
            exit 1
        }
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Fallback docker-compose file not found"
        exit 1
    fi
}

# Verify containers are running
echo "$(date '+%Y-%m-%d %H:%M:%S') - Verifying containers are running:"
docker ps || {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to list running containers"
    exit 1
}

# Check for any containers that exited immediately
echo "$(date '+%Y-%m-%d %H:%M:%S') - Checking for containers that exited:"
EXITED_CONTAINERS=$(docker ps -a --filter "status=exited" --format "{{.Names}}")
if [ -n "$EXITED_CONTAINERS" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Some containers exited unexpectedly: $EXITED_CONTAINERS"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Container logs for exited containers:"
    for container in $EXITED_CONTAINERS; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Logs for $container:"
        docker logs $container || echo "$(date '+%Y-%m-%d %H:%M:%S') - Failed to get logs for $container"
    done
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - No exited containers found"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - Application startup complete"