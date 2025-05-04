import fs from 'fs';
import path from 'path';
import { scanDirectory } from '../../utils/fileUtils.js';
import { validateRepositoryPath } from '../../utils/pathUtils.js';

/**
 * Represents a dependency between two files
 */
export interface Dependency {
  source: string; // Path of the file containing the import
  target: string; // Path or module being imported
  type: string; // Type of dependency (import, require, include)
  isExternal: boolean; // Whether the dependency is from an external package
}

/**
 * Represents a dependency cycle
 */
export interface DependencyCycle {
  paths: string[]; // Files involved in the cycle
  length: number; // Number of files in the cycle
}

/**
 * Results from dependency analysis
 */
export interface DependencyAnalysisResult {
  dependencies: Dependency[]; // All direct dependencies
  dependencyCounts: Record<
    string,
    {
      // Count of dependencies for each file
      inbound: number; // Number of files importing this file
      outbound: number; // Number of files this file imports
    }
  >;
  cycles: DependencyCycle[]; // Detected dependency cycles
  externalDependencies: Set<string>; // External package dependencies
}

/**
 * Regular expressions for extracting imports
 */
const IMPORT_PATTERNS = {
  // JavaScript/TypeScript imports
  js: [
    // ES6 imports
    /import\s+(?:(?:[^{},\s]+),\s*)?(?:{[^{}]*})?\s*from\s+['"]([^'"]+)['"]/g,
    // CommonJS require
    /(?:const|let|var)\s+(?:\w+|\{[^}]*\})\s*=\s*require\(['"]([^'"]+)['"]\)/g,
    // Dynamic import
    /import\(['"]([^'"]+)['"]\)/g,
  ],
  // Python imports
  py: [/import\s+(\w+)/g, /from\s+([^\s]+)\s+import/g],
  // Java imports
  java: [/import\s+([^;]+);/g],
  // C/C++ includes
  c: [/#include\s+["<]([^">]+)[">]/g],
  // Ruby requires
  ruby: [/require\s+['"]([^'"]+)['"]/g],
};

/**
 * Extract dependencies from a file
 *
 * @param filePath - Path to the file
 * @param repositoryPath - Root repository path
 * @returns Array of dependencies
 */
function extractDependencies(filePath: string, repositoryPath: string): Dependency[] {
  const dependencies: Dependency[] = [];
  const relativePath = path.relative(repositoryPath, filePath);
  const fileExtension = path.extname(filePath).substring(1).toLowerCase();

  // Select appropriate regex patterns based on file extension
  let patterns: RegExp[] = [];

  if (['js', 'jsx', 'ts', 'tsx'].includes(fileExtension)) {
    patterns = IMPORT_PATTERNS.js;
  } else if (['py'].includes(fileExtension)) {
    patterns = IMPORT_PATTERNS.py;
  } else if (['java'].includes(fileExtension)) {
    patterns = IMPORT_PATTERNS.java;
  } else if (['c', 'cpp', 'h', 'hpp'].includes(fileExtension)) {
    patterns = IMPORT_PATTERNS.c;
  } else if (['rb'].includes(fileExtension)) {
    patterns = IMPORT_PATTERNS.ruby;
  } else {
    // No recognized pattern for this file type
    return dependencies;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Apply each pattern to extract dependencies
    for (const pattern of patterns) {
      // Reset regex lastIndex to avoid issues with global flag
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const targetModule = match[1].trim();

          // Determine if dependency is external
          const isExternal =
            !targetModule.startsWith('.') && !targetModule.startsWith('/') && !targetModule.includes(':');

          dependencies.push({
            source: relativePath,
            target: targetModule,
            type: pattern.toString().includes('require')
              ? 'require'
              : pattern.toString().includes('include')
                ? 'include'
                : 'import',
            isExternal,
          });
        }
      }
    }
  } catch (error) {
    // Skip files that can't be read
  }

  return dependencies;
}

/**
 * Build a dependency graph for cycle detection
 *
 * @param dependencies - List of extracted dependencies
 * @returns Adjacency list representation of the graph
 */
function buildDependencyGraph(dependencies: Dependency[]): Record<string, string[]> {
  const graph: Record<string, string[]> = {};

  // Initialize graph with empty adjacency lists
  for (const dep of dependencies) {
    if (!graph[dep.source]) {
      graph[dep.source] = [];
    }

    // Only add non-external dependencies to the graph
    if (!dep.isExternal) {
      // Normalize the target path if it's a relative path
      let targetPath = dep.target;
      if (targetPath.startsWith('.')) {
        // This is a simplification - proper path resolution would be more complex
        // and would handle file extensions and directory indexes
        const sourceDir = path.dirname(dep.source);
        targetPath = path.normalize(path.join(sourceDir, targetPath));

        // Add common extensions if not specified
        if (!path.extname(targetPath)) {
          // Try to find matching files with extensions
          for (const ext of ['.js', '.ts', '.jsx', '.tsx']) {
            if (graph[`${targetPath}${ext}`]) {
              targetPath = `${targetPath}${ext}`;
              break;
            }
          }
        }
      }

      // Add edge to graph
      if (graph[dep.source].indexOf(targetPath) === -1) {
        graph[dep.source].push(targetPath);
      }
    }
  }

  return graph;
}

/**
 * Detect cycles in the dependency graph using DFS
 *
 * @param graph - Dependency graph
 * @returns List of detected cycles
 */
function detectCycles(graph: Record<string, string[]>): DependencyCycle[] {
  const cycles: DependencyCycle[] = [];
  const visited: Record<string, boolean> = {};
  const recursionStack: Record<string, boolean> = {};

  // DFS function to detect cycles
  function dfs(node: string, path: string[] = []): void {
    // Mark current node as visited and add to recursion stack
    visited[node] = true;
    recursionStack[node] = true;
    path.push(node);

    // Visit all neighbors
    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      // Skip if neighbor is not in the graph (external dependency)
      if (!graph[neighbor]) continue;

      // If not visited, recurse
      if (!visited[neighbor]) {
        dfs(neighbor, [...path]);
      }
      // If in recursion stack, we found a cycle
      else if (recursionStack[neighbor]) {
        // Find where the cycle starts
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cycle = path.slice(cycleStartIndex);
          // Add the starting node to close the cycle
          cycle.push(neighbor);

          cycles.push({
            paths: cycle,
            length: cycle.length,
          });
        }
      }
    }

    // Remove from recursion stack
    recursionStack[node] = false;
  }

  // Run DFS from each unvisited node
  for (const node in graph) {
    if (!visited[node]) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Analyze dependencies in a repository
 *
 * This function scans files in a repository, extracts import statements,
 * builds a dependency graph, and identifies circular dependencies.
 *
 * @param repositoryPath - Path to the repository root
 * @param excludePaths - Paths to exclude from analysis
 * @returns Dependency analysis results
 */
export async function analyzeDependencies(
  repositoryPath: string,
  excludePaths: string[] = ['node_modules', 'dist', '.git', 'build']
): Promise<DependencyAnalysisResult> {
  // Validate the repository path
  validateRepositoryPath(repositoryPath);

  // Get all files in the repository
  const filePaths = await scanDirectory(repositoryPath, excludePaths);

  // Extract dependencies from all files
  const allDependencies: Dependency[] = [];
  for (const filePath of filePaths) {
    const deps = extractDependencies(filePath, repositoryPath);
    allDependencies.push(...deps);
  }

  // Count inbound and outbound dependencies
  const dependencyCounts: Record<string, { inbound: number; outbound: number }> = {};

  // Initialize counts
  for (const dep of allDependencies) {
    if (!dependencyCounts[dep.source]) {
      dependencyCounts[dep.source] = { inbound: 0, outbound: 0 };
    }

    // For non-external dependencies, initialize the target too
    if (!dep.isExternal && !dependencyCounts[dep.target]) {
      dependencyCounts[dep.target] = { inbound: 0, outbound: 0 };
    }
  }

  // Count dependencies
  for (const dep of allDependencies) {
    // Increment outbound count for source
    dependencyCounts[dep.source].outbound++;

    // Increment inbound count for target (only for internal dependencies)
    if (!dep.isExternal && dependencyCounts[dep.target]) {
      dependencyCounts[dep.target].inbound++;
    }
  }

  // Build dependency graph for cycle detection
  const dependencyGraph = buildDependencyGraph(allDependencies);

  // Detect cycles
  const cycles = detectCycles(dependencyGraph);

  // Collect external dependencies
  const externalDependencies = new Set<string>();
  for (const dep of allDependencies) {
    if (dep.isExternal) {
      externalDependencies.add(dep.target);
    }
  }

  return {
    dependencies: allDependencies,
    dependencyCounts,
    cycles,
    externalDependencies,
  };
}
