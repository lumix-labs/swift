import * as fs from 'fs';
import * as path from 'path';
import { getRepoBasePath } from '../utils.js';
import { logInfo, logError } from '../../../utils/logFormatter.js';
import { Snapshot, SnapshotMetadata } from '../get-analytics-tool.js';

const SERVICE_NAME = 'swift-mcp-service';
const SERVICE_VERSION = '1.0.0';

/**
 * List available analytics snapshots, optionally filtered
 *
 * @param limit - Maximum number of snapshots to return
 * @param toolId - Optional tool ID filter
 * @param repositoryName - Optional repository name filter
 * @returns Array of snapshot metadata
 */
export async function listAnalyticsSnapshots(
  limit: number = 10,
  toolId?: string,
  repositoryName?: string
): Promise<Snapshot[]> {
  try {
    // Get base repository path
    const repoBasePath = getRepoBasePath();
    const snapshotsPath = path.join(repoBasePath, 'snapshots');

    // Check if snapshots directory exists
    try {
      await fs.promises.access(snapshotsPath);
    } catch (error) {
      // Directory doesn't exist yet, no snapshots available
      return [];
    }

    // Read snapshot directories
    const snapshotDirs = await fs.promises.readdir(snapshotsPath);

    // Sort by name (timestamp) in descending order
    snapshotDirs.sort((a, b) => b.localeCompare(a));

    // Apply limit
    const limitedDirs = snapshotDirs.slice(0, limit);

    // Load metadata for each snapshot
    const snapshots: Snapshot[] = [];

    for (const dir of limitedDirs) {
      const snapshotPath = path.join(snapshotsPath, dir);

      // Check if it's a directory
      const stats = await fs.promises.stat(snapshotPath);
      if (!stats.isDirectory()) continue;

      // Load metadata.json
      const metadataPath = path.join(snapshotPath, 'metadata.json');
      let metadata: SnapshotMetadata;

      try {
        const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(metadataContent) as SnapshotMetadata;
      } catch (error) {
        // Skip snapshots without metadata
        continue;
      }

      // Apply filters
      if (toolId && metadata.tool_id !== toolId) continue;
      if (repositoryName && metadata.repository_info?.name !== repositoryName) continue;

      // Load summary data for the tool
      let summaryData: Record<string, unknown> | undefined;

      if (metadata.tool_id) {
        const summaryPath = path.join(snapshotPath, `${metadata.tool_id}.json`);

        try {
          const summaryContent = await fs.promises.readFile(summaryPath, 'utf8');
          summaryData = JSON.parse(summaryContent) as Record<string, unknown>;
        } catch (error) {
          // Summary data not available
        }
      }

      // Add to snapshots list (path property now exists in Snapshot interface)
      snapshots.push({
        id: dir,
        path: snapshotPath,
        metadata,
        summaryData,
      });
    }

    logInfo(`Retrieved ${snapshots.length} analytics snapshots`, SERVICE_NAME, SERVICE_VERSION);

    return snapshots;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logError(`Error listing analytics snapshots`, SERVICE_NAME, SERVICE_VERSION, err);

    throw err;
  }
}

/**
 * Get the latest analytics snapshot
 *
 * @param toolId - Optional tool ID filter
 * @param repositoryName - Optional repository name filter
 * @returns Latest snapshot or null if none found
 */
export async function getLatestSnapshot(toolId?: string, repositoryName?: string): Promise<Snapshot | null> {
  try {
    // Get list of snapshots with limit 1
    const snapshots = await listAnalyticsSnapshots(1, toolId, repositoryName);

    if (snapshots.length === 0) {
      return null;
    }

    // Get detailed data if available
    const snapshot = snapshots[0];

    if (snapshot.metadata?.tool_id && snapshot.path) {
      const detailedPath = path.join(snapshot.path, `${snapshot.metadata.tool_id}_detailed.json`);

      try {
        const detailedContent = await fs.promises.readFile(detailedPath, 'utf8');
        snapshot.detailedData = JSON.parse(detailedContent) as Record<string, unknown>;
      } catch (error) {
        // Detailed data not available, that's fine
      }
    }

    logInfo(`Retrieved latest analytics snapshot: ${snapshot.id}`, SERVICE_NAME, SERVICE_VERSION);

    return snapshot;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logError(`Error getting latest analytics snapshot`, SERVICE_NAME, SERVICE_VERSION, err);

    throw err;
  }
}

/**
 * Get a specific analytics snapshot by ID
 *
 * @param snapshotId - Snapshot ID (timestamp)
 * @param toolId - Optional tool ID filter
 * @param repositoryName - Optional repository name filter
 * @returns Snapshot data or null if not found
 */
export async function getSnapshot(
  snapshotId: string,
  toolId?: string,
  repositoryName?: string
): Promise<Snapshot | null> {
  try {
    // Get base repository path
    const repoBasePath = getRepoBasePath();
    const snapshotPath = path.join(repoBasePath, 'snapshots', snapshotId);

    // Check if snapshot directory exists
    try {
      await fs.promises.access(snapshotPath);
    } catch (error) {
      // Snapshot doesn't exist
      return null;
    }

    // Load metadata.json
    const metadataPath = path.join(snapshotPath, 'metadata.json');
    let metadata: SnapshotMetadata;

    try {
      const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(metadataContent) as SnapshotMetadata;
    } catch (error) {
      // Invalid snapshot without metadata
      return null;
    }

    // Apply filters
    if (toolId && metadata.tool_id !== toolId) return null;
    if (repositoryName && metadata.repository_info?.name !== repositoryName) return null;

    // Load summary data
    let summaryData: Record<string, unknown> | undefined;

    if (metadata.tool_id) {
      const summaryPath = path.join(snapshotPath, `${metadata.tool_id}.json`);

      try {
        const summaryContent = await fs.promises.readFile(summaryPath, 'utf8');
        summaryData = JSON.parse(summaryContent) as Record<string, unknown>;
      } catch (error) {
        // Summary data not available
      }
    }

    // Load detailed data
    let detailedData: Record<string, unknown> | undefined;

    if (metadata.tool_id) {
      const detailedPath = path.join(snapshotPath, `${metadata.tool_id}_detailed.json`);

      try {
        const detailedContent = await fs.promises.readFile(detailedPath, 'utf8');
        detailedData = JSON.parse(detailedContent) as Record<string, unknown>;
      } catch (error) {
        // Detailed data not available, that's fine
      }
    }

    logInfo(`Retrieved analytics snapshot: ${snapshotId}`, SERVICE_NAME, SERVICE_VERSION);

    // Path property now exists in Snapshot interface
    return {
      id: snapshotId,
      path: snapshotPath,
      metadata,
      summaryData,
      detailedData,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logError(`Error getting analytics snapshot: ${snapshotId}`, SERVICE_NAME, SERVICE_VERSION, err);

    throw err;
  }
}
