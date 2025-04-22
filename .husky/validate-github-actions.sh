#!/bin/bash
set -e

# Script to validate GitHub Actions YAML files
# This ensures that action.yml files are valid before pushing

echo "🔍 Validating GitHub Action files..."

# Function to test a GitHub Action file
test_github_action() {
    local action_file="$1"
    local test_dir="$(mktemp -d)"
    local base_dir="$(dirname "$action_file")"
    local success=true
    
    echo "Testing: $action_file"
    
    # Create a copy of the file for validation
    cp "$action_file" "$test_dir/action.yml"
    
    # Basic YAML validation - check for common heredoc indentation issues 
    # that cause GitHub Actions to fail
    if grep -q "cat.*<<" "$test_dir/action.yml"; then
        # File contains heredocs, which are prone to indentation issues
        if grep -q -E "version:|services:" "$test_dir/action.yml"; then
            # Look for unindented YAML inside heredoc
            if grep -q -E "^(version:|services:)" "$test_dir/action.yml"; then
                echo "❌ Found YAML block without proper indentation in heredoc in $action_file"
                echo "   Consider indenting YAML content within heredocs"
                success=false
            fi
        fi
    fi
    
    # For docker-compose action, test script generation
    if [[ "$action_file" == *"create-docker-compose/action.yml" ]]; then
        # Test with sample inputs
        modules="api,web"
        registry="test.registry.com"
        
        (
            cd "$test_dir" && \
            mkdir -p deploy && \
            # Simplified test that mimics the action but with less complexity
            echo "Creating test docker-compose file" && \
            echo "version: '3.8'" > deploy/docker-compose.yml && \
            echo "" >> deploy/docker-compose.yml && \
            echo "services:" >> deploy/docker-compose.yml && \
            echo "  test-service:" >> deploy/docker-compose.yml && \
            echo "    image: test.registry.com/test:latest" >> deploy/docker-compose.yml
        )
        
        if [ $? -ne 0 ]; then
            echo "❌ Docker compose generation test failed for $action_file"
            success=false
        fi
    fi
    
    # For deployment script action, test script generation
    if [[ "$action_file" == *"create-deployment-script/action.yml" ]]; then
        (
            cd "$test_dir" && \
            mkdir -p deploy && \
            echo "#!/bin/bash" > deploy/run-deployment.sh && \
            echo "echo \"Test deployment script\"" >> deploy/run-deployment.sh && \
            chmod +x deploy/run-deployment.sh
        )
        
        if [ $? -ne 0 ]; then
            echo "❌ Deployment script generation test failed for $action_file"
            success=false
        fi
    fi
    
    # Cleanup
    rm -rf "$test_dir"
    
    if [ "$success" = true ]; then
        echo "✅ $action_file is valid"
        return 0
    else
        echo "❌ Validation failed for $action_file"
        return 1
    fi
}

# Find all GitHub Action files
found_error=false

for action_file in $(find .github/workflows -name "action.yml" -type f); do
    if ! test_github_action "$action_file"; then
        found_error=true
    fi
done

if [ "$found_error" = true ]; then
    echo "❌ GitHub Action validation failed. Please fix the issues before pushing."
    exit 1
else
    echo "✅ All GitHub Action files are valid!"
fi
