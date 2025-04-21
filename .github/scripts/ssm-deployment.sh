#!/bin/bash
# SSM Deployment script for secure EC2 deployments
set -e

# Logging function
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check required parameters
if [ -z "$1" ]; then
  log "ERROR: Missing instance ID parameter"
  echo "Usage: $0 <instance-id> [region]"
  exit 1
fi

INSTANCE_ID="$1"
AWS_REGION="${2:-us-east-1}"

# Create temporary directory for deployment files
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

log "Creating deployment package in $TEMP_DIR"

# Copy docker-compose.yml if it exists
if [ -f "docker-compose.yml" ]; then
  cp docker-compose.yml "$TEMP_DIR/"
fi

# Create deployment script
cat > "$TEMP_DIR/deploy.sh" << 'EOF'
#!/bin/bash
set -e

echo "Starting deployment process at $(date)"

# Check if we have docker-compose.yml
if [ ! -f "docker-compose.yml" ]; then
  echo "ERROR: docker-compose.yml file not found"
  exit 1
fi

# Copy to app directory
echo "Copying docker-compose.yml to /app/"
cp docker-compose.yml /app/

# Navigate to app directory
cd /app

# Authenticate with ECR using instance role
if command -v aws >/dev/null 2>&1; then
  echo "Authenticating with Amazon ECR..."
  export AWS_ECR_PASSWORD=$(aws ecr get-login-password --region $AWS_REGION)
  echo "$AWS_ECR_PASSWORD" | docker login --username AWS --password-stdin $AWS_ECR_REGISTRY
else
  echo "WARNING: AWS CLI not found, skipping ECR authentication"
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
echo "Checking container status:"
docker-compose ps

echo "Deployment completed at $(date)"
EOF

chmod +x "$TEMP_DIR/deploy.sh"

# Create archive
cd "$TEMP_DIR"
zip -r ../deployment.zip ./*
cd - >/dev/null

log "Deployment package created: deployment.zip"

# Upload to S3
S3_BUCKET="swift-deployments-$AWS_REGION"
S3_KEY="deployments/$(date +%Y%m%d%H%M%S).zip"

log "Creating S3 bucket $S3_BUCKET if it doesn't exist..."
aws s3api create-bucket \
  --bucket "$S3_BUCKET" \
  --region "$AWS_REGION" \
  --create-bucket-configuration LocationConstraint="$AWS_REGION" || true

log "Uploading deployment package to s3://$S3_BUCKET/$S3_KEY"
aws s3 cp deployment.zip "s3://$S3_BUCKET/$S3_KEY"

# Create and run SSM command
log "Sending deployment command to instance $INSTANCE_ID"
CMD_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunRemoteScript" \
  --parameters "{\"sourceType\":[\"S3\"],\"sourceInfo\":[\"{\\\"path\\\":\\\"https://s3.$AWS_REGION.amazonaws.com/$S3_BUCKET/$S3_KEY\\\"}\"],\"commandLine\":[\"./deploy.sh\"]}" \
  --timeout-seconds 600 \
  --region "$AWS_REGION" \
  --output text \
  --query "Command.CommandId")

log "Deployment command ID: $CMD_ID"
log "Waiting for command to complete..."

# Wait for command to complete
aws ssm wait command-executed \
  --command-id "$CMD_ID" \
  --instance-id "$INSTANCE_ID" \
  --region "$AWS_REGION"

# Get command result
RESULT=$(aws ssm get-command-invocation \
  --command-id "$CMD_ID" \
  --instance-id "$INSTANCE_ID" \
  --region "$AWS_REGION" \
  --query "Status" \
  --output text)

log "Command status: $RESULT"

if [ "$RESULT" != "Success" ]; then
  log "Deployment failed. Error output:"
  aws ssm get-command-invocation \
    --command-id "$CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --region "$AWS_REGION" \
    --query "StandardErrorContent" \
    --output text
  exit 1
fi

log "Standard output:"
aws ssm get-command-invocation \
  --command-id "$CMD_ID" \
  --instance-id "$INSTANCE_ID" \
  --region "$AWS_REGION" \
  --query "StandardOutputContent" \
  --output text

log "Deployment completed successfully"
