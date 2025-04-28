# Swift Web Services

This directory contains service implementations for the Swift web application.

## Services Structure

### GitHub Service
- `github/index.ts` - Main GitHub service exports
- `github/api.ts` - GitHub API client
- `github/types.ts` - Type definitions

### Storage Service
- `storage/index.ts` - Storage service exports
- `storage/repository-store.ts` - Repository storage handling

### Filesystem Service
- `filesystem/index.ts` - Filesystem service exports
- `filesystem/zip-handler.ts` - ZIP file handling

## Usage Examples

### GitHub Service
```typescript
import { githubService } from '../services';

// Add a repository
const result = await githubService.addRepository('owner/repo');

// Download a repository as ZIP
const downloadResult = await githubService.downloadRepositoryZip(repoId);
```

### Storage Service
```typescript
import { repositoryStore } from '../services';

// Get all repositories
const repos = await repositoryStore.getRepositories();
```

### Filesystem Service
```typescript
import { zipHandler } from '../services';

// Download a ZIP file
await zipHandler.downloadZip(url, filename);
```
