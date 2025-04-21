#!/bin/bash
set -e

# Define the location of the Swift scripts directory
SCRIPT_DIR="/tmp/swift-scripts"
LOGFILE="/var/log/swift-setup.log"

# Ensure the scripts directory exists
mkdir -p $SCRIPT_DIR

# Create and execute each script in order
echo "$(date '+%Y-%m-%d %H:%M:%S') - Starting Swift application setup" | tee -a $LOGFILE

# Export variables for scripts to use
export LOGFILE AWS_REGION="${aws_region}" CONTAINER_IMAGE_API="${container_image_api}" CONTAINER_IMAGE_WEB="${container_image_web}"

# Source each script in sequence
for script in "$SCRIPT_DIR"/*.sh; do
  if [ -f "$script" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Executing $(basename $script)" | tee -a $LOGFILE
    bash "$script" || {
      echo "$(date '+%Y-%m-%d %H:%M:%S') - ERROR: Script $(basename $script) failed with exit code $?" | tee -a $LOGFILE
      exit 1
    }
  fi
done

echo "$(date '+%Y-%m-%d %H:%M:%S') - Swift application setup completed successfully" | tee -a $LOGFILE
