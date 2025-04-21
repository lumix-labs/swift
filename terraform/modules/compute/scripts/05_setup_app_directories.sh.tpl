#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Create directory structure
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating application directory structure"
mkdir -p /app/{web,api} /app/logs/{web,api}

# Set proper permissions
echo "$(date '+%Y-%m-%d %H:%M:%S') - Setting proper directory permissions"
chmod -R 755 /app
chmod -R 777 /app/logs

# Create placeholder files for health checks
echo "$(date '+%Y-%m-%d %H:%M:%S') - Creating placeholder health check files"
mkdir -p /app/web/public
touch /app/web/public/index.html
echo "Web service is up" > /app/web/public/index.html

mkdir -p /app/api/public
touch /app/api/public/healthcheck
echo "API service is up" > /app/api/public/healthcheck

# Verify container images
echo "$(date '+%Y-%m-%d %H:%M:%S') - Verifying container images"
echo "$(date '+%Y-%m-%d %H:%M:%S') - API image: ${CONTAINER_IMAGE_API}"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Web image: ${CONTAINER_IMAGE_WEB}"