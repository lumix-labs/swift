import { Octokit } from "@octokit/rest";

interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  url: string;
  stars?: number;
}

interface GitHubRepoResponse {
  success: boolean;
  message: string;
  repo?: GitHubRepo;
}

class GithubService {
  private octokit: Octokit;
  private SWIFT_REPOS_STORAGE_KEY = 'swift_github_repositories';

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
   * Load repositories from localStorage
   */
  loadRepositories(): GitHubRepo[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const storedRepos = localStorage.getItem(this.SWIFT_REPOS_STORAGE_KEY);
    return storedRepos ? JSON.parse(storedRepos) : [];
  }

  /**
   * Save repositories to localStorage
   */
  saveRepositories(repos: GitHubRepo[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SWIFT_REPOS_STORAGE_KEY, JSON.stringify(repos));
    }
  }

  /**
   * Add a new GitHub repository
   * @param url GitHub repository URL
   * @returns Object containing success status, message, and repo info if successful
   */
  async addRepository(url: string): Promise<GitHubRepoResponse> {
    // Parse GitHub URL
    const parsed = this.parseGitHubUrl(url);
    if (!parsed) {
      return {
        success: false,
        message: 'Invalid GitHub repository URL. Please use format: owner/repo or github.com/owner/repo'
      };
    }
    
    // Check if repository exists and is public
    const repo = await this.getRepositoryInfo(parsed.owner, parsed.repo);
    if (!repo) {
      return {
        success: false,
        message: 'Repository not found or not public. Please check the URL and try again.'
      };
    }
    
    // Check if repository is already in the list
    const currentRepos = this.loadRepositories();
    if (currentRepos.some(r => r.id === repo.id)) {
      return {
        success: false,
        message: 'This repository is already in your list.',
        repo
      };
    }
    
    // Add repository to the list
    const updatedRepos = [...currentRepos, repo];
    this.saveRepositories(updatedRepos);
    
    return {
      success: true,
      message: `Repository ${repo.fullName} added successfully.`,
      repo
    };
  }

  /**
   * Remove a GitHub repository
   * @param repoId Repository ID to remove
   * @returns Object containing success status and message
   */
  removeRepository(repoId: string): { success: boolean; message: string } {
    const currentRepos = this.loadRepositories();
    const initialLength = currentRepos.length;
    
    const updatedRepos = currentRepos.filter(repo => repo.id !== repoId);
    
    if (updatedRepos.length === initialLength) {
      return {
        success: false,
        message: 'Repository not found in your list.'
      };
    }
    
    this.saveRepositories(updatedRepos);
    
    return {
      success: true,
      message: 'Repository removed successfully.'
    };
  }

  /**
   * Get repository name
   * @param repoId Repository ID
   * @returns Repository name or null if not found
   */
  getRepositoryName(repoId: string): string | null {
    const repositories = this.loadRepositories();
    const repo = repositories.find(r => r.id === repoId);
    return repo ? repo.name : null;
  }

  /**
   * Get repository stars
   * @param repoId Repository ID
   * @returns Repository stars count or null if not found
   */
  getRepositoryStars(repoId: string): number | null {
    const repositories = this.loadRepositories();
    const repo = repositories.find(r => r.id === repoId);
    return repo?.stars ?? null;
  }
}

// Export a singleton instance
const githubService = new GithubService();
export default githubService;

// Export types
export type { GitHubRepo, GitHubRepoResponse };
