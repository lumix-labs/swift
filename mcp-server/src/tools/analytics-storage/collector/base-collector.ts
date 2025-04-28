import * as fs from 'fs';
import * as path from 'path';
import {
  getRepoBasePath,
  createAnalyticsFilePath,
  updateIndexFile,
  validateSchema,
} from '../utils.js';
import { logInfo, logError } from '../../../utils/logFormatter.js';

/**
 * Type definition for collector metadata
 */
export interface CollectorMetadata {
  tool_id: string;
  tool_version: string;
  schema_version: string;
  timestamp: string;
  repository_info: RepositoryInfo;
  execution_time_ms: number;
  error?: string; // Add optional error property
}

/**
 * Repository information interface
 */
export interface RepositoryInfo {
  name: string;
  branch?: string;
  commitHash?: string;
  path?: string;
}

/**
 * Storage result interface
 */
export interface StorageResult {
  snapshotId: string;
  snapshotPath: string;
  metadata: CollectorMetadata;
}

/**
 * Base Analytics Collector
 *
 * This class provides the foundation for tool-specific analytics collectors.
 * It handles common functionality like metadata collection, file I/O,
 * schema validation, and directory structure management.
 */
export class AnalyticsCollector {
  private toolId: string;
  private toolVersion: string;
  private repositoryInfo: RepositoryInfo;
  private schemaVersion = '1.0.0'; // Track schema version for future compatibility
  private readonly SERVICE_NAME = 'swift-mcp-service';
  private readonly SERVICE_VERSION = '1.0.0';

  /**
   * Create a new AnalyticsCollector
   *
   * @param toolId - Unique tool identifier
   * @param toolVersion - Semantic version of the tool
   * @param repositoryInfo - Information about the repository
   */
  constructor(toolId: string, toolVersion: string, repositoryInfo: RepositoryInfo) {
    this.toolId = toolId;
    this.toolVersion = toolVersion;
    this.repositoryInfo = repositoryInfo;
  }

  /**
   * Collect standard metadata for the analytics
   *
   * @returns Metadata object
   */
  private collectMetadata(): CollectorMetadata {
    return {
      tool_id: this.toolId,
      tool_version: this.toolVersion,
      schema_version: this.schemaVersion,
      timestamp: new Date().toISOString(),
      repository_info: this.repositoryInfo,
      execution_time_ms: 0, // Will be updated before storage
    };
  }

  /**
   * Store analytics data in the standardized format
   *
   * @param summaryData - Summary data for dashboard display
   * @param detailedData - Optional detailed data
   * @returns Object with snapshot information
   */
  async store(
    summaryData: Record<string, unknown>,
    detailedData?: Record<string, unknown>
  ): Promise<StorageResult> {
    const startTime = Date.now();

    try {
      // If no repository path is provided, skip analytics storage
      if (!this.repositoryInfo.path) {
        logInfo(
          `Skipping analytics storage for repository-less tool ${this.toolId}`,
          this.SERVICE_NAME,
          this.SERVICE_VERSION
        );
        return {
          snapshotId: 'analytics-skipped',
          snapshotPath: '',
          metadata: this.collectMetadata(),
        };
      }

      // Get base repository path
      const repoBasePath = getRepoBasePath(this.repositoryInfo.path);

      // If repoBasePath is empty, skip analytics storage
      if (!repoBasePath) {
        logInfo(
          `Skipping analytics storage for ${this.toolId} due to invalid repository path`,
          this.SERVICE_NAME,
          this.SERVICE_VERSION
        );
        return {
          snapshotId: 'analytics-skipped',
          snapshotPath: '',
          metadata: this.collectMetadata(),
        };
      }

      // Create metadata with initial execution time
      const metadata = this.collectMetadata();

      // Create timestamp-based analytics file path
      const { timestampId, analyticsPath, indexPath } = await createAnalyticsFilePath(
        repoBasePath,
        this.toolId
      );

      // Validate the summary data schema
      validateSchema(summaryData);

      // Prepare data for storage (combine metadata and summary)
      const storageData = {
        metadata,
        summary: summaryData,
        detailed: detailedData || null,
      };

      // Store analytics data
      await fs.promises.writeFile(analyticsPath, JSON.stringify(storageData, null, 2), 'utf8');

      // Update execution time
      metadata.execution_time_ms = Date.now() - startTime;
      storageData.metadata = metadata;

      // Update with actual execution time
      await fs.promises.writeFile(analyticsPath, JSON.stringify(storageData, null, 2), 'utf8');

      // Update the index file with latest reference
      await updateIndexFile(indexPath, timestampId, metadata);

      logInfo(`Analytics data stored successfully`, this.SERVICE_NAME, this.SERVICE_VERSION, {
        context: {
          snapshotId: timestampId,
          snapshotPath: analyticsPath,
          toolId: this.toolId,
          repository: this.repositoryInfo.name,
        },
      });

      return {
        snapshotId: timestampId,
        snapshotPath: analyticsPath,
        metadata,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      logError(`Error storing analytics data`, this.SERVICE_NAME, this.SERVICE_VERSION, err, {
        context: {
          toolId: this.toolId,
          repository: this.repositoryInfo.name,
        },
      });

      throw err;
    }
  }
}
