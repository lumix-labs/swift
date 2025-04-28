import { Octokit } from "@octokit/rest";
import { GitHubRepo } from "./types";

class GithubApiService {
  private octokit: Octokit;

  constructor() {
    // Initialize Octokit without authentication for public repo access
    this.octokit = new Octokit();
  }

  /**
   * Parses a GitHub URL to extract owner and repo name
   * Supports formats:
   * - https://github.com/owner/repo
   * - http://github.com/owner/repo
   * - github.com/owner/repo
   * - owner/repo
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    // Match github.com URLs
    const githubUrlRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/?$/;
    const urlMatch = url.match(githubUrlRegex);
    
    if (urlMatch) {
      return {
        owner: urlMatch[1],
        repo: urlMatch[2]
      };
    }
    
    // Match simple owner/repo format
    const simpleRegex = /^([^\/]+)\/([^\/]+)$/;
    const simpleMatch = url.match(simpleRegex);
    
    if (simpleMatch) {
      return {
        owner: simpleMatch[1],
        repo: simpleMatch[2]
      };
    }
    
    return null;
  }

  /**
   * Get repository information using Octokit
   * @param owner Repository owner
   * @param repo Repository name
   * @returns Repository information if exists and public, null otherwise
   */
  async getRepositoryInfo(owner: string, repo: string): Promise<GitHubRepo | null> {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo
      });
      
      // Check if repository is private
      if (response.data.private) {
        return null;
      }
      
      return {
        id: response.data.id.toString(),
        name: response.data.name,
        fullName: response.data.full_name,
        url: response.data.html_url,
        stars: response.data.stargazers_count
      };
    } catch (error) {
      console.error('Error fetching GitHub repository:', error);
      return null;
    }
  }

  /**
   * Get a download URL for the repository as ZIP
   * @param owner Repository owner
   * @param repo Repository name
   * @param ref Branch or commit reference (default: main branch)
   * @returns URL to download the repository as ZIP or null on error
   */
  async getRepositoryZipUrl(owner: string, repo: string, ref: string = ''): Promise<string | null> {
    try {
      // Use GitHub's codeload domain which properly handles repository downloads
      // This is the actual domain GitHub uses for downloads in their UI
      const refParam = ref || 'main'; // Use main as default branch if ref is not provided
      const downloadUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${refParam}`;
      
      return downloadUrl;
    } catch (error) {
      console.error('Error generating repository ZIP URL:', error);
      return null;
    }
  }
}

// Export a singleton instance
const githubApiService = new GithubApiService();
export default githubApiService;
