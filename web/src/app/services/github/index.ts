import { GitHubRepo, GitHubRepoResponse, GitHubDownloadResponse } from "./types";
import githubApiService from "./api";
import repositoryStore from "../storage/repository-store";
import zipHandler from "../filesystem/zip-handler";

class GithubService {
  /**
   * Parse a GitHub URL to extract owner and repo name
   */
  parseGitHubUrl(url: string): { owner: string; repo: string } | null {
    return githubApiService.parseGitHubUrl(url);
  }

  /**
   * Load repositories from storage
   */
  async loadRepositories(): Promise<GitHubRepo[]> {
    return await repositoryStore.getRepositories();
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
    const repo = await githubApiService.getRepositoryInfo(parsed.owner, parsed.repo);
    if (!repo) {
      return {
        success: false,
        message: 'Repository not found or not public. Please check the URL and try again.'
      };
    }
    
    // Check if repository is already in the list
    const currentRepos = await this.loadRepositories();
    if (currentRepos.some(r => r.id === repo.id)) {
      return {
        success: false,
        message: 'This repository is already in your list.',
        repo
      };
    }
    
    // Add repository to the database
    await repositoryStore.saveRepository(repo);
    
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
  async removeRepository(repoId: string): Promise<{ success: boolean; message: string }> {
    const success = await repositoryStore.removeRepository(repoId);
    
    if (!success) {
      return {
        success: false,
        message: 'Repository not found in your list.'
      };
    }
    
    return {
      success: true,
      message: 'Repository removed successfully.'
    };
  }

  /**
   * Get repository by ID
   * @param repoId Repository ID
   * @returns Repository or undefined if not found
   */
  async getRepository(repoId: string): Promise<GitHubRepo | undefined> {
    return await repositoryStore.getRepository(repoId);
  }

  /**
   * Get repository name
   * @param repoId Repository ID
   * @returns Repository name or null if not found
   */
  async getRepositoryName(repoId: string): Promise<string | null> {
    const repo = await this.getRepository(repoId);
    return repo ? repo.name : null;
  }

  /**
   * Get repository stars
   * @param repoId Repository ID
   * @returns Repository stars count or null if not found
   */
  async getRepositoryStars(repoId: string): Promise<number | null> {
    const repo = await this.getRepository(repoId);
    return repo?.stars ?? null;
  }

  /**
   * Download a repository as a ZIP file
   * @param repoId Repository ID to download
   * @returns Object containing success status, message, and download URL if successful
   */
  async downloadRepositoryZip(repoId: string): Promise<GitHubDownloadResponse> {
    try {
      // Find the repository in the stored list
      const repo = await this.getRepository(repoId);
      
      if (!repo) {
        return {
          success: false,
          message: 'Repository not found in your list.'
        };
      }
      
      // Parse the full name to get owner and repo
      const [owner, repoName] = repo.fullName.split('/');
      
      // Generate download URL
      let downloadUrl = await githubApiService.getRepositoryZipUrl(owner, repoName);
      
      // If main branch fails, try common alternative branch names
      if (!downloadUrl) {
        const commonBranches = ['master', 'develop', 'dev', 'release'];
        
        for (const branch of commonBranches) {
          const altUrl = await githubApiService.getRepositoryZipUrl(owner, repoName, branch);
          if (altUrl) {
            downloadUrl = altUrl;
            break;
          }
        }
      }
      
      if (!downloadUrl) {
        return {
          success: false,
          message: 'Unable to generate download URL for this repository.'
        };
      }
      
      // Trigger the download
      const downloadSuccess = await zipHandler.downloadZip(downloadUrl, `${repoName}.zip`);
      
      if (!downloadSuccess) {
        return {
          success: false,
          message: 'Failed to start download. Please try again.'
        };
      }
      
      return {
        success: true,
        message: `Downloading ${repo.name}.zip...`,
        downloadUrl
      };
    } catch (error) {
      console.error('Error downloading repository as ZIP:', error);
      return {
        success: false,
        message: 'An error occurred while downloading the repository.'
      };
    }
  }
}

// Export a singleton instance
const githubService = new GithubService();
export default githubService;

// Export types
export type { GitHubRepo, GitHubRepoResponse, GitHubDownloadResponse };
