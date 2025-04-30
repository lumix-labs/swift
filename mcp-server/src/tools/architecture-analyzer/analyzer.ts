import { logInfo, logWarning } from '../../utils/index.js';
import {
  ArchitectureAnalyzerInput,
  ArchitectureAnalysisResult,
  ArchitectureAnalyzerSummary,
  CircularDependency,
  ModuleCoupling,
  VisualizationData,
  ApiSurfaceResult,
} from './types.js';
import {
  findSourceFiles,
  extractDependencies,
  buildDependencyGraph,
  detectCircularDependencies,
  calculateCouplingMetrics,
  generateVisualization,
  analyzeApiSurface,
} from './utils.js';
import * as os from 'os';
import * as path from 'path';

export class ArchitectureAnalyzer {
  // Number of files to process in a batch before showing progress
  private readonly PROGRESS_BATCH_SIZE = 20;
  // Number of files to process in parallel
  private readonly MAX_PARALLEL_FILES = Math.max(1, Math.min(os.cpus().length - 1, 4));

  constructor(private input: ArchitectureAnalyzerInput) {}

  async analyze(): Promise<{
    result: ArchitectureAnalysisResult;
    summary: ArchitectureAnalyzerSummary;
  }> {
    const startTime = Date.now();
    logInfo('Starting architecture analysis...', 'architecture-analyzer', '0.1.0', {
      context: { input: this.input },
    });

    const files = await findSourceFiles(this.input);
    if (files.length === 0) {
      logWarning('No source files found matching the criteria.', 'architecture-analyzer', '0.1.0');
      return this.emptyResult();
    }

    logInfo(
      `Processing ${files.length} files with ${this.MAX_PARALLEL_FILES} parallel workers`,
      'architecture-analyzer',
      '0.1.0'
    );

    // Process files in parallel batches for better performance
    const dependencyMap = new Map<string, string[]>();
    const batches = this.createBatches(files, this.MAX_PARALLEL_FILES);
    let processedCount = 0;

    for (const batch of batches) {
      // Process each batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          const relativePath = this.getRelativePath(file);
          const deps = await extractDependencies(file, this.input.repositoryPath);
          return { file: relativePath, deps };
        })
      );

      // Add batch results to the dependency map
      for (const { file, deps } of batchResults) {
        dependencyMap.set(file, deps);
      }

      // Show progress periodically
      processedCount += batch.length;
      if (processedCount % this.PROGRESS_BATCH_SIZE === 0 || processedCount === files.length) {
        const percentage = Math.round((processedCount / files.length) * 100);
        logInfo(
          `Processed ${processedCount}/${files.length} files (${percentage}%)`,
          'architecture-analyzer',
          '0.1.0'
        );
      }
    }

    // Build and analyze the graph
    const graph = buildDependencyGraph(dependencyMap);
    const circularDeps = detectCircularDependencies(graph);
    const couplingMetrics = calculateCouplingMetrics(graph);

    const moduleCount = graph.size;
    let dependencyCount = 0;
    graph.forEach((deps) => (dependencyCount += deps.size));

    // Generate visualization if requested
    let visualization: VisualizationData | undefined;

    if (this.input.generateVisualization !== false) {
      logInfo(
        `Generating ${this.input.visualizationFormat || 'd3'} visualization...`,
        'architecture-analyzer',
        '0.1.0'
      );
      try {
        visualization = generateVisualization(
          graph,
          couplingMetrics,
          circularDeps,
          this.input.visualizationFormat || 'd3'
        );
        logInfo(`Visualization generated successfully.`, 'architecture-analyzer', '0.1.0');
      } catch (error: any) {
        logWarning(
          `Failed to generate visualization: ${error.message}`,
          'architecture-analyzer',
          '0.1.0'
        );
      }
    }

    // Analyze API surface if requested
    let apiSurface: ApiSurfaceResult | undefined;

    if (this.input.analyzeApiSurface === true) {
      logInfo('Starting API surface analysis...', 'architecture-analyzer', '0.1.0');
      try {
        apiSurface = await analyzeApiSurface(files, this.input.repositoryPath);
        logInfo(
          `API surface analysis completed. Found ${apiSurface.publicApiSurface.length} public API members and ${apiSurface.encapsulationIssues.length} encapsulation issues.`,
          'architecture-analyzer',
          '0.1.0'
        );
      } catch (error: any) {
        logWarning(
          `Failed to analyze API surface: ${error.message}`,
          'architecture-analyzer',
          '0.1.0'
        );
      }
    }

    const result: ArchitectureAnalysisResult = {
      moduleCount: moduleCount,
      dependencyCount: dependencyCount,
      circularDependencies: circularDeps.map((path) => ({ path })),
      couplingMetrics: couplingMetrics,
      visualization,
      apiSurface,
    };

    // Calculate accurate summary metrics based on the couplingMetrics
    let totalInstability = 0;
    let maxAfferentCoupling = 0;
    let maxEfferentCoupling = 0;

    if (couplingMetrics.length > 0) {
      // Calculate average instability and find maximum coupling values
      for (const metric of couplingMetrics) {
        totalInstability += metric.instability;
        maxAfferentCoupling = Math.max(maxAfferentCoupling, metric.afferentCoupling);
        maxEfferentCoupling = Math.max(maxEfferentCoupling, metric.efferentCoupling);
      }

      const summary: ArchitectureAnalyzerSummary = {
        moduleCount: moduleCount,
        dependencyCount: dependencyCount,
        circularDependencyCount: circularDeps.length,
        averageInstability:
          couplingMetrics.length > 0 ? totalInstability / couplingMetrics.length : 0,
        maxAfferentCoupling: maxAfferentCoupling,
        maxEfferentCoupling: maxEfferentCoupling,
      };

      const duration = Date.now() - startTime;
      logInfo(
        `Architecture analysis completed in ${duration}ms`,
        'architecture-analyzer',
        '0.1.0',
        {
          context: {
            moduleCount,
            dependencyCount,
            circularDeps: circularDeps.length,
            processingTime: duration,
            filesPerSecond: Math.round((files.length / duration) * 1000),
          },
        }
      );

      return { result, summary };
    } else {
      // Handle case where no coupling metrics were calculated
      const summary: ArchitectureAnalyzerSummary = {
        moduleCount: moduleCount,
        dependencyCount: dependencyCount,
        circularDependencyCount: circularDeps.length,
        averageInstability: 0,
        maxAfferentCoupling: 0,
        maxEfferentCoupling: 0,
      };

      const duration = Date.now() - startTime;
      logInfo(
        `Architecture analysis completed in ${duration}ms`,
        'architecture-analyzer',
        '0.1.0',
        {
          context: { moduleCount, dependencyCount, circularDeps: circularDeps.length },
        }
      );

      return { result, summary };
    }
  }

  /**
   * Create batches of files for parallel processing
   */
  private createBatches(files: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get path relative to repository root, handling trailing slashes consistently
   */
  private getRelativePath(filePath: string): string {
    // Ensure consistent handling of trailing slashes
    const repoPath = this.input.repositoryPath.endsWith('/')
      ? this.input.repositoryPath
      : this.input.repositoryPath + '/';

    return filePath.startsWith(repoPath)
      ? filePath.substring(repoPath.length)
      : path.relative(this.input.repositoryPath, filePath);
  }

  private emptyResult(): {
    result: ArchitectureAnalysisResult;
    summary: ArchitectureAnalyzerSummary;
  } {
    const result: ArchitectureAnalysisResult = {
      moduleCount: 0,
      dependencyCount: 0,
      circularDependencies: [],
      couplingMetrics: [],
    };
    const summary: ArchitectureAnalyzerSummary = {
      moduleCount: 0,
      dependencyCount: 0,
      circularDependencyCount: 0,
      averageInstability: 0,
      maxAfferentCoupling: 0,
      maxEfferentCoupling: 0,
    };
    return { result, summary };
  }
}
