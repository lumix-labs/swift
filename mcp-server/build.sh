#!/bin/bash
set -e
rm -rf build

# Run TypeScript compiler to generate build
echo "Compiling TypeScript..."

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "Building Docker image..."
    docker build -t lumixlabs/swift-mcp-server .
    
    # Verify the build directory exists in the container
    echo "Verifying build directory in container..."
    docker run --rm lumixlabs/swift-mcp-server ls -la /app/build
    
    echo "Docker image built successfully!"
else
    echo "Docker not found - skipping Docker image build."
fi

# Note: We no longer remove the build directory at the end
echo "Build completed successfully!"
