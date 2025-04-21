#!/bin/bash
set -e

# Main entry point script for user_data
# This script downloads and deploys all the individual component scripts

# Setup logging
LOGFILE="/var/log/swift-setup.log"
exec > >(tee -a $LOGFILE) 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Swift application setup"
echo "$(date '+%Y-%m-%d %H:%M:%S') - AWS Region: ${aws_region}"

# Create scripts directory
SCRIPT_DIR="/tmp/swift-scripts"
mkdir -p $SCRIPT_DIR

# Create each script
cat > $SCRIPT_DIR/01_setup_logging.sh << 'EOL'
${file("${path.module}/scripts/01_setup_logging.sh.tpl")}
EOL

cat > $SCRIPT_DIR/02_install_dependencies.sh << 'EOL'
${file("${path.module}/scripts/02_install_dependencies.sh.tpl")}
EOL

cat > $SCRIPT_DIR/03_setup_cloudwatch.sh << 'EOL'
${file("${path.module}/scripts/03_setup_cloudwatch.sh.tpl")}
EOL

cat > $SCRIPT_DIR/04_configure_aws.sh << 'EOL'
${file("${path.module}/scripts/04_configure_aws.sh.tpl")}
EOL

cat > $SCRIPT_DIR/05_setup_app_directories.sh << 'EOL'
${file("${path.module}/scripts/05_setup_app_directories.sh.tpl")}
EOL

cat > $SCRIPT_DIR/06_setup_docker_compose.sh << 'EOL'
${file("${path.module}/scripts/06_setup_docker_compose.sh.tpl")}
EOL

cat > $SCRIPT_DIR/07_start_application.sh << 'EOL'
${file("${path.module}/scripts/07_start_application.sh.tpl")}
EOL

cat > $SCRIPT_DIR/08_setup_health_check.sh << 'EOL'
${file("${path.module}/scripts/08_setup_health_check.sh.tpl")}
EOL

# Make all scripts executable
chmod +x $SCRIPT_DIR/*.sh

# Export variables for scripts to use
export LOGFILE="/var/log/swift-setup.log"
export AWS_REGION="${aws_region}"
export CONTAINER_IMAGE_API="${container_image_api}"
export CONTAINER_IMAGE_WEB="${container_image_web}"

# Create a persistent environment file
cat > /etc/swift-environment << EOL
LOGFILE="/var/log/swift-setup.log"
AWS_REGION="${aws_region}"
CONTAINER_IMAGE_API="${container_image_api}"
CONTAINER_IMAGE_WEB="${container_image_web}"
EOL

# Execute each script in sequence
for script in $SCRIPT_DIR/*.sh; do
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Executing $(basename $script)" | tee -a $LOGFILE
  
  # Source the environment exports if available
  if [ -f "/tmp/aws-env-exports.sh" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Sourcing environment exports" | tee -a $LOGFILE
    source /tmp/aws-env-exports.sh
  fi
  
  # Execute the script with full environment
  bash -c "
    export LOGFILE=\"$LOGFILE\"
    export AWS_REGION=\"$AWS_REGION\"
    export CONTAINER_IMAGE_API=\"$CONTAINER_IMAGE_API\"
    export CONTAINER_IMAGE_WEB=\"$CONTAINER_IMAGE_WEB\"
    export ECR_ENDPOINT=\"$ECR_ENDPOINT\"
    export ECR_LOGIN_SUCCESS=\"$ECR_LOGIN_SUCCESS\"
    
    $script
  " || {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Script $(basename $script) failed with exit code $?" | tee -a $LOGFILE
    exit 1
  }
done

echo "$(date '+%Y-%m-%d %H:%M:%S') - Swift application setup completed successfully"

# Add a diagnostic script that can help troubleshoot any future issues
cat > /usr/local/bin/swift-diagnostic << 'EOL'
#!/bin/bash
echo "Swift Diagnostic Tool"
echo "====================="
echo "Checking Docker service status:"
systemctl status docker

echo -e "\nChecking running containers:"
docker ps -a

echo -e "\nChecking Docker images:"
docker images

echo -e "\nChecking container logs:"
for container in $(docker ps -a --format "{{.Names}}"); do
  echo -e "\nLogs for $container:"
  docker logs $container | tail -n 50
done

echo -e "\nChecking application deployment logs:"
tail -n 100 /var/log/swift-setup.log

echo -e "\nChecking system memory usage:"
free -h

echo -e "\nChecking disk space:"
df -h
EOL

chmod +x /usr/local/bin/swift-diagnostic
