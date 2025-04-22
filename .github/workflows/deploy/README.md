# Deployment GitHub Actions

This directory contains GitHub Actions for deploying the Swift application.

## Validation

GitHub Action files in this directory are automatically validated before each push using the pre-push hook. To manually validate these files, run:

```bash
./.husky/validate-github-actions.sh
```

## Files Structure

- **create-docker-compose**: Creates the docker-compose.yml file for deployment
- **create-deployment-script**: Generates the deployment shell script
- **deploy-via-ssm**: Handles deployment through AWS SSM
- **parse-params**: Parses deployment parameters
- **verify-deployment**: Verifies the deployment was successful

## Best Practices

When modifying these GitHub Action files:

1. Avoid unindented YAML inside heredocs (`<<EOF`)
2. Always indent content within heredocs
3. Use single quotes around heredoc delimiters (`<<'EOF'`) to prevent variable expansion
4. Test locally before pushing using the validation script
5. For complex additions, test in the test-deploy directory

## Common Issues

- YAML files fail with "While scanning a simple key, could not find expected ':'":
  - This typically means YAML indentation is incorrect
  - Ensure YAML within heredocs is properly indented
  - Avoid unindented YAML content in action.yml files
