#!/bin/bash
set -e

# Setup logging
LOGFILE="${LOGFILE:-/var/log/swift-setup.log}"
exec > >(tee -a $LOGFILE) 2>&1

echo "$(date '+%Y-%m-%d %H:%M:%S') - Setting up logging"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Log file: $LOGFILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') - AWS Region: ${aws_region}"

# Create log directory if it doesn't exist
mkdir -p $(dirname $LOGFILE)
