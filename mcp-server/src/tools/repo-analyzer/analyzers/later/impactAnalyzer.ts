import { CodeSymbol } from './semanticAnalyzer.js';
import { Dependency } from './dependencyAnalyzer.js';
import { DataFlow } from './flowAnalyzer.js';
import { SymbolReference } from './crossReferenceAnalyzer.js';

/**
 * Change impact prediction for a file
 */
export interface ImpactPrediction {
  filePath: string; // File being changed
  impactScore: number; // Normalized impact score (0-100)
  directImpact: string[]; // Files directly affected
  transitiveImpact: string[]; // Files indirectly affected
  totalImpactCount: number; // Total number of affected files
  riskyAreas: Array<{
    // Areas with high risk of regression
    path: string;
    risk: number; // Risk score (0-100)
    reason: string; // Reason for high risk
  }>;
}

/**
 * Risk assessment for a potential change
 */
export interface ChangeRisk {
  type: 'low' | 'medium' | 'high';
  score: number; // Risk score (0-100)
  factors: string[]; // Factors contributing to risk
  mitigations: string[]; // Suggested mitigations
}

/**
 * Results from impact analysis
 */
export interface ImpactAnalysisResult {
  impactByFile: Record<string, ImpactPrediction>; // Impact predictions by file
  mostImpactfulFiles: string[]; // Files with highest impact scores
  leastImpactfulFiles: string[]; // Files with lowest impact scores
  isolatedFiles: string[]; // Files with minimal dependencies
  riskFactors: Record<string, string[]>; // Risk factors by file
}

/**
 * Analyze potential change impact
 *
 * This function predicts what areas of the codebase might be affected by changes
 * to specific files or components, calculates risk scores, and identifies areas
 * that require careful testing or refactoring.
 *
 * @param symbols - Code symbols from semantic analysis
 * @param dependencies - File dependencies
 * @param dataFlows - Data flow connections
 * @param references - Symbol references
 * @returns Impact analysis results
 */
export function analyzeChangeImpact(
  symbols: Record<string, CodeSymbol>,
  dependencies: Dependency[],
  dataFlows: DataFlow[],
  references: SymbolReference[]
): ImpactAnalysisResult {
  // Get unique file paths
  const filePaths = new Set<string>();

  // Collect file paths from symbols
  for (const symbol of Object.values(symbols)) {
    filePaths.add(symbol.filePath);
  }

  // Initialize impact predictions for each file
  const impactByFile: Record<string, ImpactPrediction> = {};

  // Analyze each file
  for (const filePath of filePaths) {
    const impact = predictFileImpact(filePath, symbols, dependencies, dataFlows, references);

    impactByFile[filePath] = impact;
  }

  // Sort files by impact score
  const sortedFiles = [...filePaths].sort(
    (a, b) => impactByFile[b].impactScore - impactByFile[a].impactScore
  );

  // Get most and least impactful files
  const mostImpactfulFiles = sortedFiles.slice(0, 10);
  const leastImpactfulFiles = sortedFiles.reverse().slice(0, 10);

  // Find isolated files (no dependencies and no dependents)
  const isolatedFiles = [...filePaths].filter(
    (file) =>
      impactByFile[file].directImpact.length === 0 &&
      !Object.values(impactByFile).some((impact) => impact.directImpact.includes(file))
  );

  // Identify risk factors for each file
  const riskFactors: Record<string, string[]> = {};

  for (const filePath of filePaths) {
    riskFactors[filePath] = identifyRiskFactors(
      filePath,
      symbols,
      dependencies,
      impactByFile[filePath]
    );
  }

  return {
    impactByFile,
    mostImpactfulFiles,
    leastImpactfulFiles,
    isolatedFiles,
    riskFactors,
  };
}

/**
 * Predict impact of changes to a file
 *
 * @param filePath - Path to the file
 * @param symbols - Code symbols
 * @param dependencies - File dependencies
 * @param dataFlows - Data flow connections
 * @param references - Symbol references
 * @returns Impact prediction for the file
 */
function predictFileImpact(
  filePath: string,
  symbols: Record<string, CodeSymbol>,
  dependencies: Dependency[],
  dataFlows: DataFlow[],
  references: SymbolReference[]
): ImpactPrediction {
  // Get symbols defined in this file
  const fileSymbols = Object.values(symbols)
    .filter((symbol) => symbol.filePath === filePath)
    .map((symbol) => symbol.name);

  // Find direct dependencies (files that import this file)
  const directDependents = dependencies
    .filter((dep) => dep.target === filePath && !dep.isExternal)
    .map((dep) => dep.source);

  // Find files that reference symbols from this file
  const symbolReferences = fileSymbols.flatMap((symbolName) =>
    references
      .filter(
        (ref) =>
          ref.targetSymbol === symbolName &&
          // Add null check to safely handle undefined sourceSymbol
          ref.sourceSymbol &&
          symbols[ref.sourceSymbol] &&
          symbols[ref.sourceSymbol].filePath !== filePath
      )
      // Add null check before accessing the sourceSymbol property
      .map((ref) =>
        ref.sourceSymbol && symbols[ref.sourceSymbol]
          ? symbols[ref.sourceSymbol].filePath || ''
          : ''
      )
  );

  // Find data flow connections to this file
  const dataFlowConnections = dataFlows
    .filter((flow) => flow.sourceFile === filePath)
    .map((flow) => flow.targetFile);

  // Combine all direct impacts
  const directImpact = [
    ...new Set([...directDependents, ...symbolReferences, ...dataFlowConnections]),
  ].filter(Boolean);

  // Calculate transitive impact (simplified)
  const visited = new Set<string>();
  const transitiveImpact: string[] = [];

  // Simple breadth-first search to find transitive impacts
  function findTransitiveImpacts(sources: string[]): void {
    const nextLevel: string[] = [];

    for (const source of sources) {
      if (visited.has(source)) continue;
      visited.add(source);

      if (source !== filePath && !directImpact.includes(source)) {
        transitiveImpact.push(source);
      }

      // Find files that depend on this one
      const dependents = dependencies
        .filter((dep) => dep.target === source && !dep.isExternal)
        .map((dep) => dep.source);

      nextLevel.push(...dependents);
    }

    if (nextLevel.length > 0) {
      findTransitiveImpacts(nextLevel);
    }
  }

  findTransitiveImpacts(directImpact);

  // Calculate impact score
  // Base score on direct impact (70%) and transitive impact (30%)
  const directWeight = 0.7;
  const transitiveWeight = 0.3;

  // Calculate raw score (number of impacted files)
  const rawScore = directImpact.length * directWeight + transitiveImpact.length * transitiveWeight;

  // Normalize score to 0-100 scale (100 being very high impact)
  // This is a simplified scoring mechanism
  const normalizedScore = Math.min(100, rawScore * 5);

  // Identify risky areas (simplified)
  const riskyAreas = identifyRiskyAreas(
    filePath,
    directImpact,
    transitiveImpact,
    symbols,
    dependencies
  );

  return {
    filePath,
    impactScore: normalizedScore,
    directImpact,
    transitiveImpact,
    totalImpactCount: directImpact.length + transitiveImpact.length,
    riskyAreas,
  };
}

/**
 * Identify areas with high risk if the file is changed
 *
 * @param filePath - Path to the file
 * @param directImpact - Directly impacted files
 * @param transitiveImpact - Transitively impacted files
 * @param symbols - Code symbols
 * @param dependencies - File dependencies
 * @returns List of risky areas
 */
function identifyRiskyAreas(
  filePath: string,
  directImpact: string[],
  transitiveImpact: string[],
  symbols: Record<string, CodeSymbol>,
  dependencies: Dependency[]
): Array<{ path: string; risk: number; reason: string }> {
  const riskyAreas: Array<{ path: string; risk: number; reason: string }> = [];

  // Check for circular dependencies
  const circularDeps = findCircularDependencies(filePath, dependencies);
  for (const cycle of circularDeps) {
    for (const path of cycle) {
      if (path !== filePath) {
        riskyAreas.push({
          path,
          risk: 90, // Very high risk
          reason: `Circular dependency with ${filePath}`,
        });
      }
    }
  }

  // Check for high fan-in (many files depend on this one)
  if (directImpact.length > 10) {
    riskyAreas.push({
      path: filePath,
      risk: 80,
      reason: `High fan-in (${directImpact.length} dependents)`,
    });
  }

  // Check for high coupling between files
  for (const impactedFile of [...directImpact, ...transitiveImpact]) {
    // Count references between the files
    const referencesFromFile = dependencies.filter(
      (dep) => dep.source === filePath && dep.target === impactedFile
    ).length;

    const referencesToFile = dependencies.filter(
      (dep) => dep.source === impactedFile && dep.target === filePath
    ).length;

    const totalReferences = referencesFromFile + referencesToFile;

    if (totalReferences > 5) {
      riskyAreas.push({
        path: impactedFile,
        risk: 70,
        reason: `High coupling with ${filePath} (${totalReferences} references)`,
      });
    }
  }

  return riskyAreas;
}

/**
 * Find circular dependencies involving a file
 *
 * @param filePath - Path to the file
 * @param dependencies - File dependencies
 * @returns List of circular dependency paths
 */
function findCircularDependencies(filePath: string, dependencies: Dependency[]): string[][] {
  const cycles: string[][] = [];
  const graph: Record<string, string[]> = {};

  // Build dependency graph
  for (const dep of dependencies) {
    if (dep.isExternal) continue;

    if (!graph[dep.source]) {
      graph[dep.source] = [];
    }

    graph[dep.source].push(dep.target);
  }

  // DFS to find cycles
  function findCycles(
    current: string,
    path: string[] = [],
    visited: Set<string> = new Set()
  ): void {
    // If we've seen this node in current path, we found a cycle
    if (path.includes(current)) {
      const cycle = [...path.slice(path.indexOf(current)), current];
      // Only include cycles that contain our target file
      if (cycle.includes(filePath)) {
        cycles.push(cycle);
      }
      return;
    }

    // If we've visited this node before, skip
    if (visited.has(current)) return;

    // Mark as visited
    visited.add(current);
    path.push(current);

    // Visit neighbors
    for (const next of graph[current] || []) {
      findCycles(next, [...path], visited);
    }
  }

  // Start DFS from the file we're analyzing
  findCycles(filePath);

  return cycles;
}

/**
 * Identify risk factors for a file
 *
 * @param filePath - Path to the file
 * @param symbols - Code symbols
 * @param dependencies - File dependencies
 * @param impact - Impact prediction
 * @returns List of risk factors
 */
function identifyRiskFactors(
  filePath: string,
  symbols: Record<string, CodeSymbol>,
  dependencies: Dependency[],
  impact: ImpactPrediction
): string[] {
  const factors: string[] = [];

  // Check impact score
  if (impact.impactScore > 80) {
    factors.push('Very high impact score');
  } else if (impact.impactScore > 50) {
    factors.push('High impact score');
  }

  // Check number of symbols
  const symbolCount = Object.values(symbols).filter((s) => s.filePath === filePath).length;

  if (symbolCount > 20) {
    factors.push(`High symbol count (${symbolCount} symbols)`);
  }

  // Check direct dependencies count
  const dependencyCount = dependencies.filter(
    (dep) => dep.source === filePath && !dep.isExternal
  ).length;

  if (dependencyCount > 15) {
    factors.push(`High outbound dependency count (${dependencyCount} dependencies)`);
  }

  // Check dependent count
  const dependentCount = dependencies.filter(
    (dep) => dep.target === filePath && !dep.isExternal
  ).length;

  if (dependentCount > 10) {
    factors.push(`High inbound dependency count (${dependentCount} dependents)`);
  }

  // Check for circular dependencies
  const circularDeps = findCircularDependencies(filePath, dependencies);
  if (circularDeps.length > 0) {
    factors.push(`Involved in ${circularDeps.length} circular dependencies`);
  }

  // Check for risky areas
  if (impact.riskyAreas.length > 0) {
    factors.push(`Affects ${impact.riskyAreas.length} high-risk areas`);
  }

  return factors;
}
