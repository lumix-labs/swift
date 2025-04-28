// GitHub Service Types

export interface GitHubRepo {
  id: string;
  name: string;
  fullName: string;
  url: string;
  stars?: number;
  localId?: string; // Local identifier
  localPath?: string; // Path to locally stored files
}

export interface GitHubRepoResponse {
  success: boolean;
  message: string;
  repo?: GitHubRepo;
}

export interface GitHubDownloadResponse {
  success: boolean;
  message: string;
  downloadUrl?: string;
}
