#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Configure AWS region
echo "$(date '+%Y-%m-%d %H:%M:%S') - Configuring AWS region: ${aws_region}"
aws configure set region ${aws_region} || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to configure AWS region"
    exit 1
}

# Get ECR authentication
echo "$(date '+%Y-%m-%d %H:%M:%S') - Authenticating with ECR"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to get AWS account ID"
    # Continue even if we can't get the account ID
    ACCOUNT_ID="618206799106"  # Hardcoding the account ID as fallback
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Using hardcoded AWS Account ID: $ACCOUNT_ID"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - AWS Account ID: $ACCOUNT_ID"
ECR_ENDPOINT="$ACCOUNT_ID.dkr.ecr.${aws_region}.amazonaws.com"
echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR Endpoint: $ECR_ENDPOINT"

# Try ECR login with retry logic, but continue even if it fails
MAX_RETRIES=3
ECR_LOGIN_SUCCESS=false
for i in $(seq 1 $MAX_RETRIES); do
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Attempting ECR login (attempt $i/$MAX_RETRIES)"
    if aws ecr get-login-password --region ${aws_region} | docker login --username AWS --password-stdin $ECR_ENDPOINT; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR login successful"
        ECR_LOGIN_SUCCESS=true
        break
    fi
    
    if [ $i -eq $MAX_RETRIES ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to authenticate with ECR after $MAX_RETRIES attempts, but continuing setup..."
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR login failed, retrying in 5 seconds..."
        sleep 5
    fi
done

# Export ECR login status and endpoint for other scripts to use
export ECR_LOGIN_SUCCESS="$ECR_LOGIN_SUCCESS"
export ECR_ENDPOINT="$ECR_ENDPOINT"

# Check if container images are defined and valid
echo "$(date '+%Y-%m-%d %H:%M:%S') - Checking container image configurations"
echo "$(date '+%Y-%m-%d %H:%M:%S') - API container image: ${container_image_api}"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Web container image: ${container_image_web}"

# Validate container images
if [ -z "${container_image_api}" ] || [ "${container_image_api}" = "" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: API container image is not defined"
    export CONTAINER_IMAGE_API_VALID="false"
else
    export CONTAINER_IMAGE_API_VALID="true"
fi

if [ -z "${container_image_web}" ] || [ "${container_image_web}" = "" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Web container image is not defined"
    export CONTAINER_IMAGE_WEB_VALID="false"
else
    export CONTAINER_IMAGE_WEB_VALID="true"
fi
