import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { cpus } from 'os';
import { Worker } from 'worker_threads';
import {
  ArchitectureAnalyzerInput,
  DependencyInfo,
  ModuleCoupling,
  VisualizationData,
  DependencyNode,
  DependencyLink,
  ApiMember,
  ApiSurfaceResult,
} from './types.js';
import { logInfo, logError, logWarning } from '../../utils/index.js';
import { extractDependenciesAST, resolveDependency } from './ast-parser.js';

const TOOL_ID = 'architecture-analyzer';
const TOOL_VERSION = '0.1.0';

/**
 * Finds relevant source code files based on input patterns.
 * Enhanced with more robust file filtering and multi-language support.
 */
export async function findSourceFiles(input: ArchitectureAnalyzerInput): Promise<string[]> {
  const {
    repositoryPath,
    includePatterns = [
      // JavaScript/TypeScript
      '**/*.{js,jsx,ts,tsx,mjs,cjs}',
      // Python
      '**/*.py',
      // Java
      '**/*.java',
      // C#
      '**/*.cs',
      // Go
      '**/*.go',
      // Rust
      '**/*.rs',
      // C/C++
      '**/*.{c,cpp,cc,h,hpp}',
      // PHP
      '**/*.php',
      // Ruby
      '**/*.rb',
      // Kotlin
      '**/*.kt',
      // Swift
      '**/*.swift',
      // Scala
      '**/*.scala',
    ],
    excludePatterns = [
      // Common directories to exclude
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.git/**',
      '**/coverage/**',
      '**/.idea/**',
      '**/__pycache__/**',
      '**/venv/**',
      '**/env/**',
      '**/bin/**',
      '**/obj/**',
      '**/target/**',
      '**/vendor/**',

      // Common test files to exclude
      '**/*.test.*',
      '**/*.spec.*',
      '**/test/**',
      '**/tests/**',

      // Docs and configuration
      '**/*.md',
      '**/*.json',
      '**/*.yaml',
      '**/*.yml',
      '**/*.config.*',
    ],
  } = input;

  logInfo(`Scanning for source files in ${repositoryPath}`, TOOL_ID, TOOL_VERSION);

  try {
    // Enhanced with proper options
    const files = await glob(includePatterns, {
      cwd: repositoryPath,
      ignore: excludePatterns,
      absolute: true,
      nodir: true,
      dot: false, // Skip hidden files
    });

    // Filter out files that are too large (potential binaries or generated files)
    const MAX_FILE_SIZE = 1024 * 1024; // 1MB
    const filteredFiles = [];

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        if (stats.size <= MAX_FILE_SIZE) {
          filteredFiles.push(file);
        } else {
          logWarning(
            `Skipping large file (${Math.round(stats.size / 1024)}KB): ${file}`,
            TOOL_ID,
            TOOL_VERSION
          );
        }
      } catch (err) {
        logWarning(`Error checking file stats for ${file}, skipping`, TOOL_ID, TOOL_VERSION);
      }
    }

    logInfo(`Found ${filteredFiles.length} source files to analyze.`, TOOL_ID, TOOL_VERSION);
    return filteredFiles;
  } catch (error: any) {
    logError(`Error scanning for files: ${error.message}`, TOOL_ID, TOOL_VERSION, error);
    return [];
  }
}

/**
 * Parses a file to extract its dependencies.
 * Uses AST-based parsing for JavaScript/TypeScript and other supported languages
 * Falls back to regex-based parsing for unsupported languages.
 */
export async function extractDependencies(
  filePath: string,
  repositoryPath: string
): Promise<string[]> {
  try {
    const fileExt = path.extname(filePath).toLowerCase();

    // Use AST-based parsing for JavaScript/TypeScript files
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(fileExt)) {
      const dependencies = await extractDependenciesAST(filePath, repositoryPath);

      // Resolve dependencies to actual file paths
      const resolvedDependencies: string[] = [];
      for (const dep of dependencies) {
        const resolved = await resolveDependency(filePath, dep, repositoryPath);
        if (resolved) {
          resolvedDependencies.push(resolved);
        } else {
          // Keep original dependency if it couldn't be resolved
          resolvedDependencies.push(dep);
        }
      }

      return resolvedDependencies;
    }

    // For other languages, use the existing regex-based parsing
    const content = await fs.readFile(filePath, 'utf-8');

    // Collection of dependencies
    const dependencies = new Set<string>();

    // Python
    if (fileExt === '.py') {
      // Match Python imports (import X, from X import Y)
      const pyImportRegex = /^\s*import\s+([^\s#]+)/gm;
      const pyFromRegex = /^\s*from\s+([^\s#.]+(?:\.[^\s#]+)?)\s+import/gm;

      let match;
      while ((match = pyImportRegex.exec(content)) !== null) {
        dependencies.add(match[1].split('.')[0]); // Take first part of the import
      }

      while ((match = pyFromRegex.exec(content)) !== null) {
        dependencies.add(match[1].split('.')[0]); // Take first part of the import
      }
    }
    // Java
    else if (fileExt === '.java') {
      // Match Java imports
      const javaImportRegex = /^\s*import\s+([^;]+);/gm;
      let match;
      while ((match = javaImportRegex.exec(content)) !== null) {
        const importStatement = match[1].trim();
        // Handle static imports
        if (importStatement.startsWith('static ')) {
          const staticImport = importStatement.substring(7);
          const lastDot = staticImport.lastIndexOf('.');
          if (lastDot > 0) {
            dependencies.add(staticImport.substring(0, lastDot));
          }
        } else {
          // Regular imports - extract package
          dependencies.add(importStatement.split('.')[0]);
        }
      }

      // Capture package declaration to establish module identity
      const packageRegex = /^\s*package\s+([^;]+);/m;
      const packageMatch = packageRegex.exec(content);
      if (packageMatch) {
        // Store package info for later reference if needed
        // This could be used for better module name resolution
      }
    }
    // C#
    else if (fileExt === '.cs') {
      // Match C# using statements
      const csUsingRegex = /^\s*using\s+([^;]+);/gm;
      let match;
      while ((match = csUsingRegex.exec(content)) !== null) {
        const usingStatement = match[1].trim();
        // Skip using static, using alias = namespace, etc.
        if (!usingStatement.includes('=') && !usingStatement.startsWith('static')) {
          dependencies.add(usingStatement.split('.')[0]);
        }
      }

      // Capture namespace declaration for module identity
      const namespaceRegex = /^\s*namespace\s+([^\s{;]+)/m;
      const namespaceMatch = namespaceRegex.exec(content);
      if (namespaceMatch) {
        // Store namespace info for later reference if needed
      }
    }
    // Go
    else if (fileExt === '.go') {
      // Match Go imports
      const goSingleImportRegex = /^\s*import\s+"([^"]+)"/gm;
      const goMultiImportRegex = /import\s*\(\s*((?:.|\n)*?)\s*\)/g;

      // Handle single imports
      let match;
      while ((match = goSingleImportRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }

      // Handle grouped imports
      while ((match = goMultiImportRegex.exec(content)) !== null) {
        const importBlock = match[1];
        const importLines = importBlock.split('\n');
        for (const line of importLines) {
          const importMatch = /\s*"([^"]+)"/.exec(line);
          if (importMatch) {
            dependencies.add(importMatch[1]);
          }
        }
      }

      // Capture package declaration for module identity
      const packageRegex = /^\s*package\s+([^\s]+)/m;
      const packageMatch = packageRegex.exec(content);
      if (packageMatch) {
        // Store package info if needed
      }
    }
    // Rust
    else if (fileExt === '.rs') {
      // Match Rust use statements
      const rustUseRegex = /^\s*use\s+([^;]+);/gm;
      let match;
      while ((match = rustUseRegex.exec(content)) !== null) {
        const useStatement = match[1].trim();
        // Handle paths with ::
        const mainModule = useStatement.split('::')[0];
        // Handle 'use crate::' or 'use super::' or 'use self::'
        if (!['crate', 'super', 'self'].includes(mainModule)) {
          dependencies.add(mainModule);
        }
      }

      // Capture mod declarations and extern crate
      const modRegex = /^\s*mod\s+([^;{]+)/gm;
      const externCrateRegex = /^\s*extern\s+crate\s+([^;]+);/gm;

      while ((match = externCrateRegex.exec(content)) !== null) {
        dependencies.add(match[1].trim());
      }
    }
    // C/C++
    else if (['.c', '.cpp', '.cc', '.h', '.hpp'].includes(fileExt)) {
      // Match C/C++ includes
      const cppIncludeRegex = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;
      let match;
      while ((match = cppIncludeRegex.exec(content)) !== null) {
        const includePath = match[1];
        // Skip standard library headers
        if (!includePath.startsWith('std') && !includePath.match(/^<[^/]+>$/)) {
          dependencies.add(includePath);
        }
      }
    }
    // PHP
    else if (fileExt === '.php') {
      // Match PHP includes, requires, namespace and use statements
      const phpIncludeRegex = /(?:include|require)(?:_once)?\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      const phpUseRegex = /^\s*use\s+([^;]+);/gm;

      let match;
      while ((match = phpIncludeRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }

      while ((match = phpUseRegex.exec(content)) !== null) {
        const useStatement = match[1].trim();
        if (!useStatement.includes(' as ')) {
          dependencies.add(useStatement.split('\\')[0]);
        }
      }
    }
    // Ruby
    else if (fileExt === '.rb') {
      // Match Ruby requires and includes
      const rubyRequireRegex = /^\s*require\s+['"]([^'"]+)['"]/gm;
      let match;
      while ((match = rubyRequireRegex.exec(content)) !== null) {
        dependencies.add(match[1]);
      }
    }

    // Basic resolution for relative paths
    const resolvedDependencies: string[] = [];
    for (const dep of dependencies) {
      if (dep.startsWith('.')) {
        try {
          const absoluteTarget = path.resolve(path.dirname(filePath), dep);
          // Check if the resolved path is still within the repository
          if (absoluteTarget.startsWith(repositoryPath)) {
            // Attempt to find the actual file (this is still naive)
            // A real resolver would check extensions, index files, package.json main fields etc.
            let relativeTarget = path.relative(repositoryPath, absoluteTarget);
            // Basic check for file existence (async preferred)
            try {
              // Check common extensions
              const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '/index.ts', '/index.js'];
              let found = false;
              if (
                require('fs').existsSync(absoluteTarget) &&
                require('fs').lstatSync(absoluteTarget).isFile()
              ) {
                found = true;
              } else {
                for (const ext of extensions) {
                  if (require('fs').existsSync(absoluteTarget + ext)) {
                    relativeTarget += ext;
                    found = true;
                    break;
                  }
                }
              }
              // If found (or potentially a directory import), add it
              if (
                found ||
                (require('fs').existsSync(path.join(repositoryPath, relativeTarget)) &&
                  require('fs').lstatSync(path.join(repositoryPath, relativeTarget)).isDirectory())
              ) {
                resolvedDependencies.push(relativeTarget);
              } else {
                logWarning(
                  `Could not confirm resolved path for relative import: ${dep} in ${filePath} (resolved to ${relativeTarget})`,
                  TOOL_ID,
                  TOOL_VERSION
                );
                // Add anyway to ensure connections are captured
                resolvedDependencies.push(relativeTarget);
              }
            } catch {
              logWarning(
                `Error checking existence for resolved path: ${relativeTarget} from ${dep} in ${filePath}`,
                TOOL_ID,
                TOOL_VERSION
              );
              // Add anyway to ensure connections are captured
              resolvedDependencies.push(path.relative(repositoryPath, absoluteTarget));
            }
          } else {
            // External to repo but still a file path
            logWarning(
              `Resolved path for ${dep} in ${filePath} is outside the repository: ${absoluteTarget}`,
              TOOL_ID,
              TOOL_VERSION
            );
            // Still add as external dependency
            resolvedDependencies.push(dep);
          }
        } catch (e) {
          logWarning(
            `Could not resolve relative path ${dep} in ${filePath}`,
            TOOL_ID,
            TOOL_VERSION
          );
          // Still add to maintain the dependency relationship
          resolvedDependencies.push(dep);
        }
      } else {
        // Non-relative paths (external packages or built-ins)
        resolvedDependencies.push(dep);
      }
    }

    return resolvedDependencies;
  } catch (error: any) {
    logError(
      `Failed to read or parse file ${filePath}: ${error.message}`,
      TOOL_ID,
      TOOL_VERSION,
      error
    );
    return [];
  }
}

/**
 * Builds a dependency graph from a list of files and their dependencies.
 * Placeholder: A real implementation would use a graph library (e.g., 'graphlib').
 */
export function buildDependencyGraph(
  dependencies: Map<string, string[]>
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const [file, deps] of dependencies.entries()) {
    if (!graph.has(file)) {
      graph.set(file, new Set());
    }
    for (const dep of deps) {
      // Filter out external dependencies for internal graph analysis
      // This logic needs refinement based on how external deps are identified
      if (dependencies.has(dep)) {
        // Simple check: is the dependency also a source file?
        graph.get(file)?.add(dep);
      }
    }
  }
  return graph;
}

/**
 * Detects circular dependencies in the graph using Tarjan's algorithm for Strongly Connected Components (SCCs).
 */
export function detectCircularDependencies(graph: Map<string, Set<string>>): string[][] {
  const nodes = Array.from(graph.keys());
  const indexMap = new Map<string, number>(); // Map node name to index
  nodes.forEach((node, i) => indexMap.set(node, i));

  let index = 0;
  const stack: number[] = [];
  const indices = new Array(nodes.length).fill(-1);
  const lowLink = new Array(nodes.length).fill(-1);
  const onStack = new Array(nodes.length).fill(false);
  const sccs: string[][] = [];

  function strongConnect(nodeIndex: number) {
    indices[nodeIndex] = index;
    lowLink[nodeIndex] = index;
    index++;
    stack.push(nodeIndex);
    onStack[nodeIndex] = true;

    const nodeName = nodes[nodeIndex];
    const neighbors = graph.get(nodeName) || new Set<string>();

    for (const neighborName of neighbors) {
      const neighborIndex = indexMap.get(neighborName);
      if (neighborIndex === undefined) continue; // Should not happen if graph is built correctly

      if (indices[neighborIndex] === -1) {
        // Successor v has not yet been visited; recurse on it
        strongConnect(neighborIndex);
        lowLink[nodeIndex] = Math.min(lowLink[nodeIndex], lowLink[neighborIndex]);
      } else if (onStack[neighborIndex]) {
        // Successor v is in stack S and hence in the current SCC
        lowLink[nodeIndex] = Math.min(lowLink[nodeIndex], indices[neighborIndex]);
      }
    }

    // If v is a root node, pop the stack and generate an SCC
    if (lowLink[nodeIndex] === indices[nodeIndex]) {
      const scc: string[] = [];
      let poppedNodeIndex: number;
      do {
        poppedNodeIndex = stack.pop()!;
        onStack[poppedNodeIndex] = false;
        scc.push(nodes[poppedNodeIndex]);
      } while (nodeIndex !== poppedNodeIndex);

      // Only consider components with more than one node as cycles for this purpose
      if (scc.length > 1) {
        sccs.push(scc.reverse()); // Reverse to get a possible dependency order within the cycle
      }
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    if (indices[i] === -1) {
      strongConnect(i);
    }
  }

  if (sccs.length > 0) {
    logWarning(`Detected ${sccs.length} circular dependency group(s).`, TOOL_ID, TOOL_VERSION);
  }

  return sccs;
}

/**
 * Calculates coupling metrics for each module in the graph.
 *
 * @param graph - The dependency graph where keys are module names and values are sets of dependencies
 * @returns An array of ModuleCoupling objects containing coupling metrics for each module
 */
export function calculateCouplingMetrics(graph: Map<string, Set<string>>): ModuleCoupling[] {
  const modules = Array.from(graph.keys());
  const metrics: ModuleCoupling[] = [];

  // Build a reverse dependency map for afferent coupling (incoming dependencies)
  const reverseGraph = new Map<string, Set<string>>();

  // Initialize reverse graph with empty sets for all modules
  for (const moduleName of modules) {
    reverseGraph.set(moduleName, new Set<string>());
  }

  // Populate reverse graph (who depends on whom)
  for (const [source, targets] of graph.entries()) {
    for (const target of targets) {
      // Only track dependencies between modules in our graph
      if (reverseGraph.has(target)) {
        const dependents = reverseGraph.get(target)!;
        dependents.add(source);
      }
    }
  }

  // Calculate metrics for each module
  for (const moduleName of modules) {
    // Efferent coupling: number of outgoing dependencies (what this module depends on)
    const outgoing = graph.get(moduleName) || new Set<string>();
    const efferentCoupling = outgoing.size;

    // Afferent coupling: number of incoming dependencies (what depends on this module)
    const incoming = reverseGraph.get(moduleName) || new Set<string>();
    const afferentCoupling = incoming.size;

    // Instability: Efferent / (Afferent + Efferent)
    // Ranges from 0 (stable) to 1 (unstable)
    // 0 means nothing changes when this module changes (stable)
    // 1 means this module is dependent on many things but nothing depends on it (unstable)
    const total = afferentCoupling + efferentCoupling;
    const instability = total === 0 ? 0 : efferentCoupling / total;

    metrics.push({
      module: moduleName,
      afferentCoupling,
      efferentCoupling,
      instability,
    });
  }

  // Sort metrics by instability (most unstable first)
  metrics.sort((a, b) => b.instability - a.instability);

  logInfo(`Calculated coupling metrics for ${metrics.length} modules.`, TOOL_ID, TOOL_VERSION);
  return metrics;
}

/**
 * Generate visualization data from the dependency graph
 *
 * @param graph - The dependency graph
 * @param couplingMetrics - Module coupling metrics (for node sizing)
 * @param circularDependencies - Detected circular dependencies (for highlighting cycles)
 * @param format - The desired visualization format
 * @returns Visualization data suitable for rendering in the requested format
 */
export function generateVisualization(
  graph: Map<string, Set<string>>,
  couplingMetrics: ModuleCoupling[],
  circularDependencies: string[][],
  format: 'd3' | 'mermaid' | 'dot' = 'd3'
): VisualizationData {
  // Create metrics lookup for quick access
  const metricsMap = new Map<string, ModuleCoupling>();
  couplingMetrics.forEach((metric) => {
    metricsMap.set(metric.module, metric);
  });

  // Create lookup for circular dependencies
  const circularLinks = new Set<string>();
  circularDependencies.forEach((cycle) => {
    for (let i = 0; i < cycle.length - 1; i++) {
      circularLinks.add(`${cycle[i]}->${cycle[i + 1]}`);
    }
    // Connect the last node back to the first
    if (cycle.length > 1) {
      circularLinks.add(`${cycle[cycle.length - 1]}->${cycle[0]}`);
    }
  });

  // Create nodes with metrics for visualization
  const nodes: DependencyNode[] = [];
  const nodeIds = new Set<string>();

  // Add nodes for all modules in the graph
  graph.forEach((_, module) => {
    nodeIds.add(module);
    const metrics = metricsMap.get(module);
    const type = module.includes('node_modules') ? 'external' : 'file';

    // Calculate group based on directory
    const directory = path.dirname(module);
    const group = directory === '.' ? 'root' : directory.split('/')[0];

    // Calculate size based on coupling (larger = more important)
    const afferent = metrics?.afferentCoupling || 0;
    const efferent = metrics?.efferentCoupling || 0;
    // Size is proportional to total coupling
    const size = 1 + Math.sqrt(afferent + efferent);

    nodes.push({
      id: module,
      label: module,
      type,
      group,
      size,
      metrics: metrics
        ? {
            afferentCoupling: metrics.afferentCoupling,
            efferentCoupling: metrics.efferentCoupling,
            instability: metrics.instability,
          }
        : undefined,
    });
  });

  // Create links for all dependencies
  const links: DependencyLink[] = [];
  graph.forEach((dependencies, source) => {
    dependencies.forEach((target) => {
      // Check if this link is part of a circular dependency
      const isCircular = circularLinks.has(`${source}->${target}`);

      links.push({
        source,
        target,
        isCircular,
        // Weight could be based on frequency of dependency
        weight: 1,
      });
    });
  });

  // Generate format-specific output
  let rawGraph: string | undefined;

  if (format === 'mermaid') {
    rawGraph = generateMermaidDiagram(nodes, links);
  } else if (format === 'dot') {
    rawGraph = generateDotDiagram(nodes, links);
  }

  return {
    format,
    nodes,
    links,
    rawGraph,
  };
}

/**
 * Generate a Mermaid flowchart diagram from nodes and links
 */
function generateMermaidDiagram(nodes: DependencyNode[], links: DependencyLink[]): string {
  let diagram = 'flowchart TD\n';

  // Add nodes with styling
  nodes.forEach((node) => {
    const style = node.metrics?.instability && node.metrics.instability > 0.7 ? ':::unstable' : '';

    diagram += `  ${node.id}["${node.label}"]${style}\n`;
  });

  // Add links with styling for circular dependencies
  links.forEach((link) => {
    const style = link.isCircular ? 'stroke:#f00,stroke-width:2px' : '';
    diagram += `  ${link.source} --> ${link.target}${style ? ` & ${style}` : ''}\n`;
  });

  // Add styling classes
  diagram += `\nclassDef unstable fill:#f96,stroke:#333,stroke-width:2px\n`;

  return diagram;
}

/**
 * Generate a GraphViz DOT diagram from nodes and links
 */
function generateDotDiagram(nodes: DependencyNode[], links: DependencyLink[]): string {
  let diagram = 'digraph {\n';
  diagram += '  rankdir=TD;\n';
  diagram += '  node [shape=box, style=filled];\n\n';

  // Create subgraphs for each group
  const groups = new Map<string, DependencyNode[]>();
  nodes.forEach((node) => {
    if (!node.group) return;

    if (!groups.has(node.group)) {
      groups.set(node.group, []);
    }
    groups.get(node.group)?.push(node);
  });

  // Add subgraphs
  groups.forEach((groupNodes, group) => {
    diagram += `  subgraph "cluster_${group}" {\n`;
    diagram += `    label="${group}";\n`;

    // Add nodes in this group
    groupNodes.forEach((node) => {
      const color =
        node.metrics?.instability && node.metrics.instability > 0.7
          ? 'fillcolor="#ff9966"'
          : 'fillcolor="#f0f0f0"';

      const size = node.size ? `, width=${node.size / 5}, height=${node.size / 5}` : '';
      diagram += `    "${node.id}" [label="${node.label}", ${color}${size}];\n`;
    });

    diagram += '  }\n\n';
  });

  // Add ungrouped nodes
  nodes
    .filter((node) => !node.group)
    .forEach((node) => {
      const color =
        node.metrics?.instability && node.metrics.instability > 0.7
          ? 'fillcolor="#ff9966"'
          : 'fillcolor="#f0f0f0"';

      const size = node.size ? `, width=${node.size / 5}, height=${node.size / 5}` : '';
      diagram += `  "${node.id}" [label="${node.label}", ${color}${size}];\n`;
    });

  diagram += '\n';

  // Add links
  links.forEach((link) => {
    const style = link.isCircular ? ', color="red", penwidth=2.0' : '';

    diagram += `  "${link.source}" -> "${link.target}"${style};\n`;
  });

  diagram += '}\n';

  return diagram;
}

/**
 * Analyzes API surface exposure for TypeScript/JavaScript projects
 * Identifies exported members, public APIs, and potential encapsulation issues
 *
 * @param files - List of source files to analyze
 * @param repositoryPath - Base path of the repository
 * @returns API surface analysis results
 */
export async function analyzeApiSurface(
  files: string[],
  repositoryPath: string
): Promise<ApiSurfaceResult> {
  logInfo('Analyzing API surface exposure...', TOOL_ID, TOOL_VERSION);

  // Filter to only include TypeScript/JavaScript files
  const tsJsFiles = files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file));

  // Track public exports, entry points and barrel files
  const exportedMembers: ApiMember[] = [];
  const entryPoints: Set<string> = new Set();
  const barrelFiles: Set<string> = new Set();

  // Find entry points (root index files, package.json main/exports fields)
  await identifyEntryPoints(repositoryPath, entryPoints);

  // First pass: collect all exported members
  for (const file of tsJsFiles) {
    try {
      const relativePath = path.relative(repositoryPath, file);
      const content = await fs.readFile(file, 'utf-8');

      // Check if this is a barrel file (mostly re-exports)
      if (path.basename(file).startsWith('index.') && hasBarrelFilePattern(content)) {
        barrelFiles.add(relativePath);
      }

      // Extract exported members from the file
      const members = extractExportedMembers(content, relativePath);
      exportedMembers.push(...members);
    } catch (error: any) {
      logWarning(`Error analyzing exports in ${file}: ${error.message}`, TOOL_ID, TOOL_VERSION);
    }
  }

  // Separate public and internal API surfaces
  const publicApiSurface: ApiMember[] = [];
  const internalApiSurface: ApiMember[] = [];

  // Trace accessibility of exports through the dependency graph
  for (const member of exportedMembers) {
    const isPublicApi = isExposedThroughEntryPoint(
      member.exposedBy,
      entryPoints,
      barrelFiles,
      exportedMembers
    );
    if (isPublicApi) {
      publicApiSurface.push(member);
    } else {
      internalApiSurface.push(member);
    }
  }

  // Identify encapsulation issues
  const encapsulationIssues = findEncapsulationIssues(
    publicApiSurface,
    internalApiSurface,
    barrelFiles
  );

  logInfo(
    `API surface analysis complete. Found ${publicApiSurface.length} public and ${internalApiSurface.length} internal API members.`,
    TOOL_ID,
    TOOL_VERSION
  );

  return {
    moduleCount: tsJsFiles.length,
    exportedMembers,
    publicApiSurface,
    internalApiSurface,
    encapsulationIssues,
  };
}

/**
 * Identifies entry points like root index files, package.json main/exports
 */
async function identifyEntryPoints(
  repositoryPath: string,
  entryPoints: Set<string>
): Promise<void> {
  try {
    // Check for package.json files to find main/exports fields
    const packageJsonFiles = await glob('**/package.json', {
      cwd: repositoryPath,
      ignore: ['**/node_modules/**'],
      absolute: false,
    });

    for (const packageJsonPath of packageJsonFiles) {
      try {
        const fullPath = path.join(repositoryPath, packageJsonPath);
        const content = await fs.readFile(fullPath, 'utf-8');
        const packageJson = JSON.parse(content);

        // Add main entry point if exists
        if (packageJson.main) {
          const mainPath = path.join(path.dirname(packageJsonPath), packageJson.main);
          entryPoints.add(mainPath);
        }

        // Add exports entry points if exists
        if (packageJson.exports) {
          if (typeof packageJson.exports === 'string') {
            const exportPath = path.join(path.dirname(packageJsonPath), packageJson.exports);
            entryPoints.add(exportPath);
          } else if (typeof packageJson.exports === 'object' && packageJson.exports !== null) {
            for (const [key, value] of Object.entries(packageJson.exports)) {
              if (typeof value === 'string') {
                const exportPath = path.join(path.dirname(packageJsonPath), value);
                entryPoints.add(exportPath);
              } else if (typeof value === 'object' && value !== null && 'default' in value) {
                const defaultExport = value.default as string;
                const exportPath = path.join(path.dirname(packageJsonPath), defaultExport);
                entryPoints.add(exportPath);
              }
            }
          }
        }

        // Add index.js, index.ts in package root as entry points
        const packageDir = path.dirname(packageJsonPath);
        for (const indexFile of ['index.js', 'index.ts', 'index.mjs', 'index.d.ts']) {
          entryPoints.add(path.join(packageDir, indexFile));
        }
      } catch (error: any) {
        logWarning(
          `Error parsing package.json ${packageJsonPath}: ${error.message}`,
          TOOL_ID,
          TOOL_VERSION
        );
      }
    }

    // Add root index files as entry points
    for (const indexFile of ['index.js', 'index.ts', 'index.mjs', 'index.d.ts']) {
      entryPoints.add(indexFile);
    }

    // Add src/index files as entry points
    for (const indexFile of ['src/index.js', 'src/index.ts', 'src/index.mjs', 'src/index.d.ts']) {
      entryPoints.add(indexFile);
    }

    logInfo(`Identified ${entryPoints.size} potential entry points`, TOOL_ID, TOOL_VERSION);
  } catch (error: any) {
    logError(`Error identifying entry points: ${error.message}`, TOOL_ID, TOOL_VERSION, error);
  }
}

/**
 * Checks if a file follows barrel file patterns (mostly re-exports)
 */
function hasBarrelFilePattern(content: string): boolean {
  // Look for patterns like:
  // - Multiple export * from statements
  // - Multiple export { x } from statements
  // - Few or no actual implementations

  const exportFromCount = (content.match(/export\s+(?:\*|\{[^}]+\})\s+from/g) || []).length;
  const implementationLines = content
    .split('\n')
    .filter(
      (line) =>
        !line.trim().startsWith('import') &&
        !line.trim().startsWith('export') &&
        !line.trim().startsWith('//') &&
        !line.trim().startsWith('/*') &&
        line.trim().length > 0
    ).length;

  return exportFromCount > 2 || (exportFromCount > 0 && implementationLines < 5);
}

/**
 * Extracts exported members from a file
 */
function extractExportedMembers(content: string, filePath: string): ApiMember[] {
  const members: ApiMember[] = [];
  const lines = content.split('\n');

  // Regular export declarations
  const exportRegex =
    /export\s+(?:(default)\s+)?(?:(class|interface|enum|function|const|let|var|type)\s+)?([a-zA-Z0-9_$]+)/g;
  let match;

  let lineIndex = 0;
  for (const line of lines) {
    while ((match = exportRegex.exec(line)) !== null) {
      const isDefault = !!match[1];
      const kind = mapToApiMemberKind(match[2] || 'variable');
      const name = match[3];

      members.push({
        name,
        kind,
        isExported: true,
        isPublic: true, // Assume public by default
        isDefault,
        exposedBy: filePath,
        location: {
          line: lineIndex,
          column: match.index,
        },
      });
    }
    lineIndex++;
  }

  // Export { x, y as z } syntax
  const namedExportRegex = /export\s+\{([^}]+)\}/g;
  const exportedSymbolRegex = /\s*([a-zA-Z0-9_$]+)(?:\s+as\s+([a-zA-Z0-9_$]+))?\s*/g;

  lineIndex = 0;
  for (const line of lines) {
    while ((match = namedExportRegex.exec(line)) !== null) {
      const exportedSymbols = match[1];
      let symbolMatch;

      while ((symbolMatch = exportedSymbolRegex.exec(exportedSymbols)) !== null) {
        const name = symbolMatch[2] || symbolMatch[1]; // Use aliased name if available

        members.push({
          name,
          kind: 'variable', // Can't determine kind from this syntax, assume variable
          isExported: true,
          isPublic: true,
          isDefault: false,
          exposedBy: filePath,
          location: {
            line: lineIndex,
            column: match.index + symbolMatch.index,
          },
        });
      }
    }
    lineIndex++;
  }

  // Extract JSDoc comments for descriptions
  extractJsDocDescriptions(content, members);

  return members;
}

/**
 * Maps TypeScript/JavaScript constructs to API member kinds
 */
function mapToApiMemberKind(kind: string): ApiMember['kind'] {
  switch (kind.toLowerCase()) {
    case 'class':
      return 'class';
    case 'interface':
      return 'interface';
    case 'enum':
      return 'enum';
    case 'function':
      return 'function';
    case 'const':
      return 'constant';
    case 'type':
      return 'type';
    case 'namespace':
      return 'namespace';
    default:
      return 'variable';
  }
}

/**
 * Extracts JSDoc descriptions for exported members
 */
function extractJsDocDescriptions(content: string, members: ApiMember[]): void {
  // Simple JSDoc extraction - can be improved with a proper JSDoc parser
  const jsDocRegex =
    /\/\*\*\s*([\s\S]*?)\s*\*\/\s*export\s+(?:default\s+)?(?:class|interface|enum|function|const|let|var|type)\s+([a-zA-Z0-9_$]+)/g;
  let match;

  while ((match = jsDocRegex.exec(content)) !== null) {
    const jsDoc = match[1];
    const name = match[2];

    // Find the member this JSDoc belongs to
    const member = members.find((m) => m.name === name);
    if (member) {
      // Extract description from JSDoc
      const descriptionMatch = jsDoc.match(/@description\s+([^\n@]*)|@desc\s+([^\n@]*)|([^@\n].+)/);
      if (descriptionMatch) {
        member.description = (
          descriptionMatch[1] ||
          descriptionMatch[2] ||
          descriptionMatch[3]
        ).trim();
      }
    }
  }
}

/**
 * Determines if a file/member is exposed through an entry point
 */
function isExposedThroughEntryPoint(
  filePath: string,
  entryPoints: Set<string>,
  barrelFiles: Set<string>,
  allExports: ApiMember[]
): boolean {
  // Direct exposure through an entry point
  if (entryPoints.has(filePath)) {
    return true;
  }

  // Check if it's exposed through a barrel file that is an entry point or exposed through another barrel
  for (const barrelFile of barrelFiles) {
    if (entryPoints.has(barrelFile)) {
      // This barrel file is an entry point, check if it re-exports our file
      if (mightReExport(barrelFile, filePath, allExports)) {
        return true;
      }
    }
  }

  // Could implement more sophisticated tracing through the export graph here

  return false;
}

/**
 * Heuristic check if a barrel file might re-export from another file
 * Without full AST parsing, this is a best-effort approach
 */
function mightReExport(barrelFile: string, targetFile: string, allExports: ApiMember[]): boolean {
  // If they're in the same directory, barrel likely re-exports
  const barrelDir = path.dirname(barrelFile);
  if (targetFile.startsWith(barrelDir)) {
    return true;
  }

  // More sophisticated analysis would trace actual exports/imports
  return false;
}

/**
 * Identifies potential encapsulation issues in the API surface
 */
function findEncapsulationIssues(
  publicApiSurface: ApiMember[],
  internalApiSurface: ApiMember[],
  barrelFiles: Set<string>
): {
  type: 'public-implementation-detail' | 'unstable-api' | 'excessive-exposure';
  member: ApiMember;
  reason: string;
}[] {
  const issues: {
    type: 'public-implementation-detail' | 'unstable-api' | 'excessive-exposure';
    member: ApiMember;
    reason: string;
  }[] = [];

  // Look for implementation details exposed in public API
  for (const member of publicApiSurface) {
    // Implementation details often have names containing "internal", "impl", "private"
    if (
      /(?:internal|impl|private|detail|utils?)\b/i.test(member.name) ||
      /(?:internal|impl|private|detail|utils?)\b/i.test(member.exposedBy)
    ) {
      issues.push({
        type: 'public-implementation-detail',
        member,
        reason: `Member "${member.name}" appears to be an implementation detail but is exposed in the public API`,
      });
    }

    // Look for unstable APIs (experimental, beta, etc.)
    if (
      /(?:experimental|beta|unstable|temp|tmp)\b/i.test(member.name) ||
      /(?:experimental|beta|unstable|temp|tmp)\b/i.test(member.exposedBy)
    ) {
      issues.push({
        type: 'unstable-api',
        member,
        reason: `Member "${member.name}" appears to be experimental or unstable but is exposed in the public API`,
      });
    }
  }

  // Find folders with excessive exports (might indicate poor encapsulation)
  const exportsByFolder = new Map<string, number>();
  for (const member of [...publicApiSurface, ...internalApiSurface]) {
    const folder = path.dirname(member.exposedBy);
    exportsByFolder.set(folder, (exportsByFolder.get(folder) || 0) + 1);
  }

  for (const [folder, count] of exportsByFolder.entries()) {
    // Consider folders with many exports (excluding barrel files)
    const folderBarrelCount = Array.from(barrelFiles).filter(
      (b) => path.dirname(b) === folder
    ).length;
    if (count > 15 && folderBarrelCount === 0) {
      // Find a representative member from this folder
      const member = [...publicApiSurface, ...internalApiSurface].find(
        (m) => path.dirname(m.exposedBy) === folder
      );
      if (member) {
        issues.push({
          type: 'excessive-exposure',
          member,
          reason: `Folder "${folder}" exports ${count} members but lacks proper encapsulation through barrel files`,
        });
      }
    }
  }

  return issues;
}
