#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

# Configure AWS region
echo "$(date '+%Y-%m-%d %H:%M:%S') - Configuring AWS region: ${AWS_REGION}"
aws configure set region ${AWS_REGION} || { 
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Failed to configure AWS region"
    exit 1
}

# Get ECR authentication
echo "$(date '+%Y-%m-%d %H:%M:%S') - Authenticating with ECR"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - WARNING: Failed to get AWS account ID"
    
    # Try to extract account ID from container image URIs
    if [[ "${CONTAINER_IMAGE_API}" =~ ^([0-9]+)\.dkr\.ecr ]]; then
        ACCOUNT_ID="${BASH_REMATCH[1]}"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Extracted AWS Account ID from API image URI: $ACCOUNT_ID"
    elif [[ "${CONTAINER_IMAGE_WEB}" =~ ^([0-9]+)\.dkr\.ecr ]]; then
        ACCOUNT_ID="${BASH_REMATCH[1]}"
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Extracted AWS Account ID from Web image URI: $ACCOUNT_ID"
    else
        # Hardcoding the account ID as fallback
        ACCOUNT_ID="618206799106"  
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Using hardcoded AWS Account ID: $ACCOUNT_ID"
    fi
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - AWS Account ID: $ACCOUNT_ID"
ECR_ENDPOINT="$ACCOUNT_ID.dkr.ecr.${AWS_REGION}.amazonaws.com"
echo "$(date '+%Y-%m-%d %H:%M:%S') - ECR Endpoint: $ECR_ENDPOINT"

# Try ECR login with retry logic, but continue even if it fails
MAX_RETRIES=3
ECR_LOGIN_SUCCESS=false
for i in $(seq 1 $MAX_RETRIES); do
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Attempting ECR login (attempt $i/$MAX_RETRIES)"
    if aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin $ECR_ENDPOINT; then
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

# Check if container images are defined and valid
echo "$(date '+%Y-%m-%d %H:%M:%S') - Checking container image configurations"
echo "$(date '+%Y-%m-%d %H:%M:%S') - API container image: ${CONTAINER_IMAGE_API}"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Web container image: ${CONTAINER_IMAGE_WEB}"

# Make sure the AWS_REGION is exported for other scripts
export AWS_REGION="${AWS_REGION}"
export ECR_ENDPOINT="${ECR_ENDPOINT}"
export ECR_LOGIN_SUCCESS="${ECR_LOGIN_SUCCESS}"

# Explicitly set container image environment variables for other scripts
export CONTAINER_IMAGE_API="${CONTAINER_IMAGE_API}"
export CONTAINER_IMAGE_WEB="${CONTAINER_IMAGE_WEB}"

# Create a file with these exports to ensure they're available to all scripts
cat > /tmp/aws-env-exports.sh << EOL
export AWS_REGION="${AWS_REGION}"
export ECR_ENDPOINT="${ECR_ENDPOINT}"
export ECR_LOGIN_SUCCESS="${ECR_LOGIN_SUCCESS}"
export CONTAINER_IMAGE_API="${CONTAINER_IMAGE_API}"
export CONTAINER_IMAGE_WEB="${CONTAINER_IMAGE_WEB}"
EOL

chmod +x /tmp/aws-env-exports.sh
echo "$(date '+%Y-%m-%d %H:%M:%S') - Created environment exports file at /tmp/aws-env-exports.sh"
