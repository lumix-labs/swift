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

# Pull images explicitly - this is important for ECR images
echo "$(date '+%Y-%m-%d %H:%M:%S') - Pulling Docker images..."
if [ "$CONTAINER_IMAGE_API_VALID" = "true" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Pulling API image: ${CONTAINER_IMAGE_API}"
    docker pull ${CONTAINER_IMAGE_API} || echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to pull API Docker image"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skipping API image pull as image reference is invalid"
fi

if [ "$CONTAINER_IMAGE_WEB_VALID" = "true" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Pulling Web image: ${CONTAINER_IMAGE_WEB}"
    docker pull ${CONTAINER_IMAGE_WEB} || echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to pull Web Docker image"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Skipping Web image pull as image reference is invalid"
fi

# Start containers
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting containers with docker-compose"
docker-compose up -d || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to start containers" 
    
    # Check what went wrong
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Docker compose configuration validation:"
    docker-compose config || echo "$(date '+%Y-%m-%d %H:%M:%S') - Failed to validate docker-compose config"
    
    # If ECR login failed and we're using ECR images, try with fallback images
    if [ "$ECR_LOGIN_SUCCESS" = "false" ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Attempting to start with fallback images since ECR login failed"
        
        # Verify fallback file exists
        if [ -f "docker-compose-fallback.yml" ]; then
            echo "$(date '+%Y-%m-%d %H:%M:%S') - Using fallback docker-compose file"
            
            # Try to start with fallback images
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
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR login was successful but containers still failed to start"
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
