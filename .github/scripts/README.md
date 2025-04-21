# GitHub Scripts

This directory contains scripts used for GitHub Actions and workflow validation.

## Workflow Validation

The `validate-workflows.js` script provides validation for GitHub workflow files to catch common errors before they're pushed to the repository.

### Features

- Basic YAML syntax validation
- Pattern validation for common GitHub Actions patterns
- Specific validation for `workflow_call` secrets inheritance
- Integration with `actionlint` if available on your system

### Usage

This script is automatically run as part of the pre-commit hook for any changes to `.github/workflows/*.yml` files.

You can also run it manually:

```bash
npm run validate:workflows
```

### Requirements

- Node.js
- js-yaml package

### Optional Tools

For enhanced validation, consider installing [actionlint](https://github.com/rhysd/actionlint):

```bash
# macOS with Homebrew
brew install actionlint

# Linux with go
go install github.com/rhysd/actionlint/cmd/actionlint@latest
```
