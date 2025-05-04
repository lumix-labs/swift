import * as fs from 'fs';
import * as path from 'path';
import { logError, logInfo } from '../../utils/logFormatter.js';
import { SnapshotMetadata } from './get-analytics-tool.js';

const SERVICE_NAME = 'swift-mcp-service';
const SERVICE_VERSION = '1.0.0';

/**
 * Get the base path for analytics storage
 *
 * @param repositoryPath - Path to the repository or directory being analyzed
 * @returns Path to the .swift/analytics directory
 */
export function getRepoBasePath(repositoryPath?: string): string {
  if (!repositoryPath) {
    // If no repository path provided, return null to indicate no analytics storage
    return '';
  }

  // Analytics storage path within the analyzed repository
  const analyticsPath = path.join(repositoryPath, '.swift', 'analytics');

  // Create directories if they don't exist
  ensureDirectoryExists(path.join(repositoryPath, '.swift'));
  ensureDirectoryExists(analyticsPath);

  return analyticsPath;
}

/**
 * Create a timestamp-based analytics file path
 *
 * @param repoBasePath - Base path for analytics storage
 * @param toolId - Tool identifier
 * @returns Object with timestampId and analytics path
 */
export async function createAnalyticsFilePath(
  repoBasePath: string,
  toolId: string
): Promise<{
  timestampId: string;
  analyticsPath: string;
  indexPath: string;
}> {
  // Generate timestamp ID in seconds format for easier sorting
  const timestampId = Math.floor(Date.now() / 1000).toString();

  // Create tool-specific directory
  const toolDir = path.join(repoBasePath, toolId);
  ensureDirectoryExists(toolDir);

  // Path for analytics file
  const analyticsPath = path.join(toolDir, `${timestampId}.json`);

  // Path for index file
  const indexPath = path.join(toolDir, 'index.json');

  return { timestampId, analyticsPath, indexPath };
}

/**
 * Index entry interface
 */
export interface IndexEntry {
  timestampId: string;
  timestamp: string;
  tool_version: string;
  repository_info: Record<string, unknown>;
  execution_time_ms: number;
}

/**
 * Index data interface
 */
export interface IndexData {
  entries: IndexEntry[];
  latest: string | null;
}

/**
 * Update or create the index file with latest analytics reference
 *
 * @param indexPath - Path to the index file
 * @param timestampId - Current timestamp ID
 * @param metadata - Metadata for the current analytics
 */
export async function updateIndexFile(
  indexPath: string,
  timestampId: string,
  metadata: SnapshotMetadata
): Promise<void> {
  try {
    let indexData: IndexData = {
      entries: [],
      latest: null,
    };

    // Read existing index if it exists
    try {
      const indexContent = await fs.promises.readFile(indexPath, 'utf8');
      indexData = JSON.parse(indexContent) as IndexData;
    } catch (error) {
      // File doesn't exist yet, start with empty index
    }

    // Create new entry
    const entry: IndexEntry = {
      timestampId,
      timestamp: metadata.timestamp || new Date().toISOString(),
      tool_version: metadata.tool_version || 'unknown',
      repository_info: metadata.repository_info || { name: 'unknown' },
      execution_time_ms: metadata.execution_time_ms || 0,
    };

    // Add to entries and set as latest
    indexData.entries.push(entry);
    indexData.latest = timestampId;

    // Keep only the last 10 entries
    if (indexData.entries.length > 10) {
      // Sort by timestampId (which is already a sortable format)
      indexData.entries.sort((a, b) => parseInt(b.timestampId) - parseInt(a.timestampId));

      // Keep only the 10 most recent
      indexData.entries = indexData.entries.slice(0, 10);
    }

    // Write updated index back to file
    await fs.promises.writeFile(indexPath, JSON.stringify(indexData, null, 2), 'utf8');

    logInfo(`Updated analytics index file`, SERVICE_NAME, SERVICE_VERSION);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logError(`Error updating analytics index file`, SERVICE_NAME, SERVICE_VERSION, err);

    // Don't throw from here to avoid failing the whole analytics storage
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 *
 * @param dir - Directory path
 */
export function ensureDirectoryExists(dir: string): void {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    logError(`Error creating directory: ${dir}`, SERVICE_NAME, SERVICE_VERSION, err);

    throw err;
  }
}

/**
 * Validate schema compliance
 *
 * @param data - Data to validate
 * @throws Error if validation fails
 */
export function validateSchema(data: Record<string, unknown>): void {
  // Basic validation for now
  // In a production system, this would use a schema validation library
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data: must be an object');
  }

  // Could add more specific validations based on tool type
}
