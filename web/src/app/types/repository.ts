import { Repository } from "../lib/types/entities";
import { RepositoryStatus } from "../lib/services/repo-download-service";

/**
 * Extended repository interface with download and status information
 */
export interface DownloadedRepository extends Repository {
  localPath?: string;
  downloadDate?: number;
  fileCount?: number;
  size?: number;
  readmeContent?: string;
  repoTree?: string; // Repository tree structure as a string
  status: RepositoryStatus;
}
