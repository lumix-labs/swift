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
   * Get the default branch name for a repository
   * @param owner Repository owner
   * @param repo Repository name
   * @returns Default branch name or null on error
   */
  async getDefaultBranch(owner: string, repo: string): Promise<string | null> {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo
      });
      
      return response.data.default_branch;
    } catch (error) {
      console.error('Error fetching repository default branch:', error);
      return null;
    }
  }

  /**
   * Get a download URL for the repository as ZIP
   * @param owner Repository owner
   * @param repo Repository name
   * @param ref Branch or commit reference (default: try to get actual default branch)
   * @returns URL to download the repository as ZIP or null on error
   */
  async getRepositoryZipUrl(owner: string, repo: string, ref: string = ''): Promise<string | null> {
    try {
      let branchName = ref;
      
      // If no branch specified, try to get the default branch
      if (!branchName) {
        branchName = (await this.getDefaultBranch(owner, repo)) ?? "";
        
        // If still no branch, fall back to common defaults
        if (!branchName) {
          // Try common branch names in order
          const commonBranches = ['main', 'master', 'develop', 'dev'];
          for (const branch of commonBranches) {
            try {
              // Check if the branch exists
              await this.octokit.repos.getBranch({
                owner,
                repo,
                branch
              });
              branchName = branch;
              break;
            } catch {
              // Branch doesn't exist, try next one
              continue;
            }
          }
          
          // If still no branch found, use main as a last resort
          if (!branchName) {
            branchName = 'main';
          }
        }
      }
      
      // Use GitHub's codeload domain which properly handles repository downloads
      const downloadUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branchName}`;
      console.log(`Generated download URL: ${downloadUrl}`);
      
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
