"use client";

/**
 * Service for interacting with GitHub API and repository operations
 */
export class GitHubApiService {
  private readonly API_BASE_URL = "/api/repos";

  /**
   * Downloads a GitHub repository as a ZIP file
   * @param repoUrl GitHub repository URL
   * @returns Promise with downloaded ZIP data as ArrayBuffer
   */
  public async downloadRepositoryZip(repoUrl: string): Promise<ArrayBuffer> {
    try {
      console.log(`Downloading repository from ${repoUrl}`);

      // Validate URL format before sending request
      if (!this.isValidGitHubUrl(repoUrl)) {
        throw new Error(`Invalid GitHub repository URL: ${repoUrl}. Please provide a valid GitHub repository URL.`);
      }

      // Use our proxy API to avoid CORS issues
      const zipUrl = `${this.API_BASE_URL}/download?url=${encodeURIComponent(repoUrl)}`;

      const response = await fetch(zipUrl);

      if (!response.ok) {
        let errorMessage = "Unknown error occurred while downloading repository";

        try {
          // Try to parse error message from the response
          const errorData = await response.json();
          errorMessage = errorData.error || `Failed to download repository (${response.status})`;
        } catch (e) {
          // If parsing fails, use generic message with status
          errorMessage = `Failed to download repository: ${response.statusText || response.status}`;
        }

        // Throw error with specific message
        throw new Error(errorMessage);
      }

      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error in downloadRepositoryZip:", error);
      throw error;
    }
  }

  /**
   * Validates if a URL is a valid GitHub repository URL
   * @param url URL to validate
   * @returns true if the URL is a valid GitHub repository URL
   */
  private isValidGitHubUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // Make sure it's a GitHub URL
      if (!parsedUrl.hostname.includes("github.com")) {
        return false;
      }

      // Make sure there's a path with at least owner/repo
      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
      if (pathParts.length < 2) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extracts repository name from URL
   * @param repoUrl GitHub repository URL
   * @returns Repository name
   */
  public extractRepoNameFromUrl(repoUrl: string): string {
    try {
      // Remove trailing slash if present
      repoUrl = repoUrl.replace(/\/$/, "");

      // Extract the repository name from URL
      const urlParts = repoUrl.split("/");

      // Get the last part of the URL which should be the repo name
      let repoName = urlParts[urlParts.length - 1];

      // Handle different GitHub URL formats
      if (repoUrl.includes("/tree/")) {
        // If URL includes a branch, get the repo name correctly
        const parsedUrl = new URL(repoUrl);
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

        if (pathParts.length >= 2) {
          repoName = pathParts[1]; // Second part of path is repo name
        }
      }

      return repoName;
    } catch (error) {
      console.error("Error extracting repo name:", error);
      // Return a fallback name if extraction fails
      return "repository";
    }
  }

  /**
   * Extracts owner name from GitHub URL
   * @param repoUrl GitHub repository URL
   * @returns Owner name
   */
  public extractOwnerFromUrl(repoUrl: string): string {
    try {
      // Parse the GitHub URL to extract owner
      const url = new URL(repoUrl);

      if (!url.hostname.includes("github.com")) {
        throw new Error("Not a GitHub URL");
      }

      const pathParts = url.pathname.split("/").filter(Boolean);

      if (pathParts.length >= 1) {
        return pathParts[0];
      }

      throw new Error("Could not extract owner from URL");
    } catch (error) {
      console.error("Error extracting owner:", error);
      return "unknown";
    }
  }
}

// Create a singleton instance
export const githubApiService = new GitHubApiService();
