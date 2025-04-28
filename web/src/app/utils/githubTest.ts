// Test script for GitHub service
import githubService from "../services/GithubService";

// Example usage:
async function testGithubService() {
  console.log("Testing GitHub Service...");
  
  // Test parseGitHubUrl
  const url = "https://github.com/facebook/react";
  const parsed = githubService.parseGitHubUrl(url);
  console.log("Parsed URL:", parsed);
  
  if (parsed) {
    // Test getRepositoryInfo
    const repo = await githubService.getRepositoryInfo(parsed.owner, parsed.repo);
    console.log("Repository info:", repo);
    
    if (repo) {
      console.log("Repository stars:", repo.stars);
    }
  }
}

// For testing in browser console
// Using unknown first to avoid TypeScript error
(window as unknown as { testGithubService: typeof testGithubService }).testGithubService = testGithubService;

export { testGithubService };
