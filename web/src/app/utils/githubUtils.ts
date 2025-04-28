/**
 * Utility functions for GitHub repository operations
 * This file maintains backward compatibility with existing code
 * while using the new GithubService internally
 */

import githubService from "../services/GithubService";

// Define a local interface to avoid name conflict
export interface GitHubRepoUtils {
  id: string;
  name: string;
  fullName: string;
  url: string;
  stars?: number;
}

// For compatibility use the same structure as GitHubRepo
export type GitHubRepo = GitHubRepoUtils;

/**
 * Parses a GitHub URL to extract owner and repo name
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  return githubService.parseGitHubUrl(url);
}

/**
 * Checks if a GitHub repository exists and is public
 */
export async function checkGitHubRepo(owner: string, repo: string): Promise<GitHubRepoUtils | null> {
  return githubService.getRepositoryInfo(owner, repo);
}

/**
 * Load repositories from localStorage
 */
export function loadRepositories(): GitHubRepoUtils[] {
  return githubService.loadRepositories();
}

/**
 * Save repositories to localStorage
 */
export function saveRepositories(repos: GitHubRepoUtils[]): void {
  githubService.saveRepositories(repos);
}

/**
 * Add a new GitHub repository
 */
export async function addGitHubRepository(url: string): Promise<{ success: boolean; message: string; repo?: GitHubRepoUtils }> {
  return githubService.addRepository(url);
}

/**
 * Remove a GitHub repository
 */
export function removeGitHubRepository(repoId: string): { success: boolean; message: string } {
  return githubService.removeRepository(repoId);
}

/**
 * Get repository name
 */
export function getRepositoryName(repoId: string): string | null {
  return githubService.getRepositoryName(repoId);
}

/**
 * Get repository stars
 */
export function getRepositoryStars(repoId: string): number | null {
  return githubService.getRepositoryStars(repoId);
}
