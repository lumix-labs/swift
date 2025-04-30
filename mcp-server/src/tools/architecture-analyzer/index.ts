import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { BaseTool } from '../base-tool.js';
import { logInfo } from '../../utils/index.js';
import {
  ArchitectureAnalyzerInput,
  ArchitectureAnalyzerInputSchema,
  ArchitectureAnalyzerOutput,
  ArchitectureAnalyzerSummary, // Keep type for internal use
} from './types.js';
import { ArchitectureAnalyzer } from './analyzer.js';

// Corrected: BaseTool only takes TInput and TOutput
export class ArchitectureAnalyzerTool extends BaseTool<
  ArchitectureAnalyzerInput,
  ArchitectureAnalyzerOutput
  // Removed ArchitectureAnalyzerSummary from generic arguments
> {
  constructor() {
    super(
      'architecture-analyzer',
      '0.1.0',
      'Analyzes repository dependencies to identify architectural patterns, coupling, and circular dependencies.'
    );
  }

  protected getSchema(): Record<string, z.ZodType<any>> {
    return ArchitectureAnalyzerInputSchema;
  }

  protected async execute(input: ArchitectureAnalyzerInput): Promise<ArchitectureAnalyzerOutput> {
    // Use properties inherited from BaseTool for logging
    logInfo(`Executing ${this.toolId} tool`, this.serviceNamespace, this.serviceVersion, {
      context: { input },
    });

    // Ensure repositoryPath is absolute within the container context
    // BaseTool or the caller should guarantee this, but double-check if needed.
    if (!input.repositoryPath.startsWith('/')) {
      throw new Error('repositoryPath must be an absolute path within the container.');
    }

    // Store analytics (using inherited method)
    // Need ArchitectureAnalyzerSummary type here, but it's not part of the class generics
    const analyzer = new ArchitectureAnalyzer(input);
    const {
      result,
      summary,
    }: { result: ArchitectureAnalyzerOutput; summary: ArchitectureAnalyzerSummary } =
      await analyzer.analyze();

    await this.storeAnalytics(
      { name: input.repositoryPath },
      summary as unknown as Record<string, unknown>, // Use double cast for summary
      result as unknown as Record<string, unknown> // Use double cast for result
    );

    return result;
  }

  // Override formatResponse for custom output formatting if needed
  protected formatResponse(result: ArchitectureAnalyzerOutput): any {
    // Convert the result into the desired text format for the AI model
    let responseText = `## Architecture Analysis Results\n\n`;
    responseText += `### Overview\n`;
    responseText += `- Modules Found: ${result.moduleCount}\n`;
    responseText += `- Internal Dependencies Found: ${result.dependencyCount}\n`;
    responseText += `- Circular Dependencies Found: ${result.circularDependencies.length}\n\n`;

    // Calculate overall architecture health score (scale of 0-100)
    const healthScore = this.calculateArchitectureHealthScore(result);
    responseText += `### Architecture Health Score: ${healthScore}/100\n`;

    // Add health score explanation
    responseText += this.getHealthScoreExplanation(healthScore, result);

    // Include API Surface Analysis section if available
    if (result.apiSurface) {
      responseText += `\n### API Surface Analysis\n`;
      responseText += `- Exported Members: ${result.apiSurface.exportedMembers.length}\n`;
      responseText += `- Public API Surface: ${result.apiSurface.publicApiSurface.length} members\n`;
      responseText += `- Internal API Surface: ${result.apiSurface.internalApiSurface.length} members\n`;
      responseText += `- Encapsulation Issues: ${result.apiSurface.encapsulationIssues.length}\n\n`;

      // If there are encapsulation issues, display them
      if (result.apiSurface.encapsulationIssues.length > 0) {
        responseText += `#### Encapsulation Issues\n`;
        responseText += `These issues may compromise your API's stability and maintainability:\n\n`;

        const issuesByType = new Map<string, { count: number; examples: string[] }>();

        // Group issues by type and collect examples
        result.apiSurface.encapsulationIssues.forEach((issue) => {
          const type = issue.type;
          if (!issuesByType.has(type)) {
            issuesByType.set(type, { count: 0, examples: [] });
          }

          const typeData = issuesByType.get(type)!;
          typeData.count++;

          // Only store up to 3 examples per type
          if (typeData.examples.length < 3) {
            typeData.examples.push(`\`${issue.member.name}\`: ${issue.reason}`);
          }
        });

        // Display issue summary by type
        for (const [type, data] of issuesByType.entries()) {
          const readableType = type
            .split('-')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          responseText += `**${readableType}** (${data.count} issues):\n`;
          data.examples.forEach((example) => {
            responseText += `- ${example}\n`;
          });

          // If there are more examples not shown
          if (data.count > data.examples.length) {
            responseText += `- ...and ${data.count - data.examples.length} more\n`;
          }

          responseText += '\n';
        }

        // Add recommendations for fixing encapsulation issues
        responseText += `#### API Encapsulation Recommendations\n`;

        if (issuesByType.has('public-implementation-detail')) {
          responseText += `- **Hide Implementation Details**: Refactor modules with naming patterns like 'internal', 'impl', or 'private' to keep them out of the public API\n`;
          responseText += `- **Use Private Exports**: Consider using the TypeScript pattern of exporting only through carefully curated barrel files\n`;
        }

        if (issuesByType.has('unstable-api')) {
          responseText += `- **Stabilize or Remove Experimental APIs**: Either stabilize APIs marked as 'experimental' or 'beta', or remove them from the public surface\n`;
          responseText += `- **Mark Unstable APIs**: Explicitly mark unstable APIs with documentation tags like @experimental or @beta\n`;
        }

        if (issuesByType.has('excessive-exposure')) {
          responseText += `- **Add Barrel Files**: Create index files in directories with excessive exports to control the public API surface\n`;
          responseText += `- **Reduce Exported Members**: Consider refactoring to reduce the overall number of exports from any single directory\n`;
        }

        responseText += `\n`;
      }

      // Show example of a good API structure
      responseText += `#### API Surface Distribution\n`;

      // Calculate distribution of API exposure by directory
      const directoryCounts = new Map<string, { public: number; internal: number }>();

      // Count public and internal APIs by directory
      result.apiSurface.publicApiSurface.forEach((member) => {
        const dir = member.exposedBy.split('/')[0];
        if (!directoryCounts.has(dir)) {
          directoryCounts.set(dir, { public: 0, internal: 0 });
        }
        directoryCounts.get(dir)!.public++;
      });

      result.apiSurface.internalApiSurface.forEach((member) => {
        const dir = member.exposedBy.split('/')[0];
        if (!directoryCounts.has(dir)) {
          directoryCounts.set(dir, { public: 0, internal: 0 });
        }
        directoryCounts.get(dir)!.internal++;
      });

      // Show top directories with most exposed APIs
      const sortedDirs = [...directoryCounts.entries()]
        .sort((a, b) => b[1].public + b[1].internal - (a[1].public + a[1].internal))
        .slice(0, 5);

      if (sortedDirs.length > 0) {
        responseText += `Top directories with most exposed APIs:\n\n`;
        responseText += `| Directory | Public APIs | Internal APIs | Total | Public:Internal Ratio |\n`;
        responseText += `|-----------|-------------|---------------|-------|----------------------|\n`;

        sortedDirs.forEach(([dir, counts]) => {
          const total = counts.public + counts.internal;
          const ratio = counts.internal > 0 ? (counts.public / counts.internal).toFixed(1) : '∞';
          responseText += `| \`${dir}\` | ${counts.public} | ${counts.internal} | ${total} | ${ratio} |\n`;
        });

        responseText += `\n`;
      }
    }

    // Include visualization information if available
    if (result.visualization) {
      responseText += `\n### Dependency Visualization\n`;

      // Add different instructions based on the visualization format
      if (result.visualization.format === 'mermaid') {
        responseText += `A mermaid diagram of your codebase architecture has been generated. You can render this diagram using any Mermaid-compatible viewer.\n\n`;
        responseText += '```mermaid\n';
        responseText += result.visualization.rawGraph || '';
        responseText += '\n```\n\n';
        responseText +=
          'The diagram shows dependencies between modules with the following features:\n';
        responseText += '- Unstable modules (high instability) are highlighted in orange\n';
        responseText += '- Circular dependencies are highlighted with red arrows\n';
        responseText += "- Node size reflects the module's coupling (larger = more coupled)\n\n";
      } else if (result.visualization.format === 'dot') {
        responseText += `A GraphViz DOT diagram of your codebase architecture has been generated. You can render it using Graphviz or online tools like GraphvizOnline.\n\n`;
        responseText += '```dot\n';
        responseText += result.visualization.rawGraph || '';
        responseText += '\n```\n\n';
        responseText +=
          'The diagram shows dependencies between modules with the following features:\n';
        responseText += '- Modules are grouped by directory\n';
        responseText += '- Unstable modules (high instability) are highlighted in orange\n';
        responseText += '- Circular dependencies are highlighted with red arrows\n';
        responseText += "- Node size reflects the module's coupling (larger = more coupled)\n\n";
      } else {
        // For D3 format, just note that the data is available
        responseText += `Dependency graph data is available in D3-compatible JSON format for custom visualization.\n`;
        responseText += `The graph contains ${result.visualization.nodes.length} nodes and ${result.visualization.links.length} links.\n\n`;
        responseText += 'Key points in the visualization data:\n';
        responseText += '- Nodes represent modules and contain their coupling metrics\n';
        responseText += '- Links represent dependencies between modules\n';
        responseText += '- Circular dependencies are marked in the links\n';
        responseText += '- Nodes are grouped by directory structure\n\n';
      }
    }

    // Include circular dependencies section if any were found
    if (result.circularDependencies.length > 0) {
      responseText += `\n### Circular Dependencies\n`;
      responseText += `Circular dependencies create tight coupling between modules and make code harder to maintain and test. Consider refactoring these cycles.\n\n`;

      result.circularDependencies.slice(0, 10).forEach((cycle, index) => {
        responseText += `${index + 1}. \`${cycle.path.join(' → ')}\`\n`;
      });
      if (result.circularDependencies.length > 10) {
        responseText += `...and ${result.circularDependencies.length - 10} more circular dependencies\n`;
      }
      responseText += `\n`;
    }

    // Include coupling metrics for the most coupled modules
    if (result.couplingMetrics.length > 0) {
      // Sort metrics by different criteria
      const mostAfferent = [...result.couplingMetrics].sort(
        (a, b) => b.afferentCoupling - a.afferentCoupling
      );
      const mostEfferent = [...result.couplingMetrics].sort(
        (a, b) => b.efferentCoupling - a.efferentCoupling
      );
      const mostUnstable = [...result.couplingMetrics]
        .filter((m) => m.afferentCoupling + m.efferentCoupling > 1)
        .sort((a, b) => b.instability - a.instability);

      // Top 5 most depended upon modules (high afferent coupling)
      responseText += `### Top 5 Most Depended Upon Modules (High Afferent Coupling)\n`;
      responseText += `These modules have many dependents and represent critical components in your architecture. Changes to these modules will have wide-ranging impacts.\n\n`;
      responseText += `| Module | Incoming Dependencies | Outgoing Dependencies | Instability |\n`;
      responseText += `|--------|----------------------|----------------------|------------|\n`;
      mostAfferent.slice(0, 5).forEach((metric) => {
        responseText += `| \`${metric.module}\` | ${metric.afferentCoupling} | ${metric.efferentCoupling} | ${metric.instability.toFixed(2)} |\n`;
      });
      responseText += `\n`;

      // Top 5 modules with most dependencies (high efferent coupling)
      responseText += `### Top 5 Modules With Most Dependencies (High Efferent Coupling)\n`;
      responseText += `These modules depend on many other modules and may be challenging to maintain. Consider whether some responsibilities can be split into separate modules.\n\n`;
      responseText += `| Module | Outgoing Dependencies | Incoming Dependencies | Instability |\n`;
      responseText += `|--------|----------------------|----------------------|------------|\n`;
      mostEfferent.slice(0, 5).forEach((metric) => {
        responseText += `| \`${metric.module}\` | ${metric.efferentCoupling} | ${metric.afferentCoupling} | ${metric.instability.toFixed(2)} |\n`;
      });
      responseText += `\n`;

      // Top 5 most unstable modules
      if (mostUnstable.length > 0) {
        responseText += `### Top 5 Most Unstable Modules (High Instability)\n`;
        responseText += `These modules are unstable (depend on many others) while also having some dependents. Changes to these modules likely cause cascading changes.\n\n`;
        responseText += `| Module | Instability | Outgoing Dependencies | Incoming Dependencies |\n`;
        responseText += `|--------|------------|----------------------|----------------------|\n`;
        mostUnstable.slice(0, 5).forEach((metric) => {
          responseText += `| \`${metric.module}\` | ${metric.instability.toFixed(2)} | ${metric.efferentCoupling} | ${metric.afferentCoupling} |\n`;
        });
        responseText += `\n`;
      }
    }

    // Add architecture insights
    responseText += `### Architecture Insights\n`;

    // Calculate some metrics for insights
    const avgDeps = result.dependencyCount / (result.moduleCount || 1); // avoid div by zero

    // Add general insights
    responseText += `- Average dependencies per module: ${avgDeps.toFixed(2)}\n`;

    // Add conditional insights based on findings
    if (result.circularDependencies.length > 0) {
      responseText += `- **Warning**: ${result.circularDependencies.length} circular dependency groups detected, which may indicate architectural issues.\n`;
      responseText += `  - **Recommendation**: Consider implementing a layered architecture or using dependency inversion to break these cycles.\n`;
    }

    // Add insight based on coupling metrics if available
    if (result.couplingMetrics.length > 0) {
      // Find highly coupled modules (both high afferent and efferent coupling)
      const highlyCoupled = result.couplingMetrics.filter(
        (m) => m.afferentCoupling > 5 && m.efferentCoupling > 5
      );

      if (highlyCoupled.length > 0) {
        responseText += `- **Potential Bottlenecks**: ${highlyCoupled.length} modules have both high incoming and outgoing dependencies, which may indicate they are architectural bottlenecks.\n`;
        responseText += `  - Examples: ${highlyCoupled
          .slice(0, 3)
          .map((m) => `\`${m.module}\``)
          .join(', ')}\n`;
        responseText += `  - **Recommendation**: Consider splitting these modules using the Single Responsibility Principle.\n`;
      }

      // Find potentially unstable but important modules
      const unstableImportant = result.couplingMetrics.filter(
        (m) => m.instability > 0.7 && m.afferentCoupling > 3
      );

      if (unstableImportant.length > 0) {
        responseText += `- **Risk Areas**: ${unstableImportant.length} important modules (many dependents) are highly unstable (depend on many other modules), representing potential risk for changes.\n`;
        responseText += `  - **Recommendation**: Consider reducing the dependencies these modules have on other modules to improve stability.\n`;
      }

      // Add distribution analysis
      const dependencyDistribution = this.analyzeDistribution(
        result.couplingMetrics.map((m) => m.efferentCoupling)
      );
      if (dependencyDistribution.skew > 1.5) {
        responseText += `- **Uneven Dependency Distribution**: A small number of modules have significantly more dependencies than others, which might indicate architectural imbalance.\n`;
        responseText += `  - **Recommendation**: Review the most dependent modules and consider redistributing responsibilities.\n`;
      }
    }

    // Add specific recommendations based on overall architecture
    responseText += `\n### Recommendations\n`;

    // Architectural patterns recommendation
    if (result.moduleCount > 50) {
      responseText += `- **Consider a modular architecture**: With ${result.moduleCount} modules, a clearly defined modular architecture with explicit boundaries would help manage complexity.\n`;
    }

    // Specific recommendations based on circular dependencies
    if (result.circularDependencies.length > 0) {
      responseText += `- **Break circular dependencies**: Introduce abstraction layers or apply the Dependency Inversion Principle to remove circular dependencies.\n`;
    }

    // Add testing implications
    responseText += `- **Testing strategy**: Modules with high afferent coupling (many dependents) should have more comprehensive tests as they impact many other modules.\n`;

    // Technical debt indicators
    if (avgDeps > 5) {
      responseText += `- **Consider refactoring highly coupled areas**: The average of ${avgDeps.toFixed(2)} dependencies per module indicates potential technical debt in terms of coupling.\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  }

  /**
   * Calculate an architecture health score based on various metrics
   * Score is on a scale of 0-100, where higher is better
   */
  private calculateArchitectureHealthScore(result: ArchitectureAnalyzerOutput): number {
    // Start with a perfect score and subtract for issues
    let score = 100;

    const moduleCount = result.moduleCount || 1; // Avoid division by zero

    // Penalize for circular dependencies (up to -30 points)
    const circularDependencyRatio = Math.min(
      1,
      result.circularDependencies.length / (moduleCount * 0.1)
    );
    score -= circularDependencyRatio * 30;

    // Penalize for high average dependencies (up to -25 points)
    const avgDeps = result.dependencyCount / moduleCount;
    const dependencyPenalty = Math.min(25, Math.max(0, (avgDeps - 3) * 5));
    score -= dependencyPenalty;

    // Penalize for modules with very high coupling (up to -25 points)
    if (result.couplingMetrics.length > 0) {
      const highlyAfferentModules = result.couplingMetrics.filter(
        (m) => m.afferentCoupling > 10
      ).length;
      const highlyEfferentModules = result.couplingMetrics.filter(
        (m) => m.efferentCoupling > 10
      ).length;

      const highlyAfferentRatio = highlyAfferentModules / moduleCount;
      const highlyEfferentRatio = highlyEfferentModules / moduleCount;

      score -= Math.min(25, (highlyAfferentRatio * 10 + highlyEfferentRatio * 15) * 100);
    }

    // Penalize for high instability among important modules (up to -20 points)
    if (result.couplingMetrics.length > 0) {
      const unstableImportantModules = result.couplingMetrics.filter(
        (m) => m.instability > 0.7 && m.afferentCoupling > 3
      ).length;

      score -= Math.min(20, (unstableImportantModules / moduleCount) * 100);
    }

    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get an explanation for the health score
   */
  private getHealthScoreExplanation(score: number, result: ArchitectureAnalyzerOutput): string {
    let explanation = '\n';

    if (score >= 90) {
      explanation +=
        'Your codebase exhibits a healthy architecture with good separation of concerns and limited coupling. Continue maintaining these best practices.\n\n';
    } else if (score >= 70) {
      explanation +=
        'Your codebase has a reasonably healthy architecture, but there are some areas that could be improved to reduce coupling and increase maintainability.\n\n';
    } else if (score >= 50) {
      explanation +=
        'Your codebase shows signs of architectural debt. There are several areas that would benefit from refactoring to reduce coupling and break circular dependencies.\n\n';
    } else {
      explanation +=
        'Your codebase has significant architectural challenges. Consider investing in a refactoring plan to reduce coupling, break circular dependencies, and create clearer module boundaries.\n\n';
    }

    // Add specific contributing factors
    explanation += 'Contributing factors:\n';

    if (result.circularDependencies.length > 0) {
      explanation += `- ${result.circularDependencies.length} circular dependencies detected\n`;
    }

    const avgDeps = result.dependencyCount / (result.moduleCount || 1);
    if (avgDeps > 5) {
      explanation += `- High average dependency count (${avgDeps.toFixed(2)} dependencies per module)\n`;
    }

    if (result.couplingMetrics.length > 0) {
      const highlyAfferentModules = result.couplingMetrics.filter(
        (m) => m.afferentCoupling > 10
      ).length;
      if (highlyAfferentModules > 0) {
        explanation += `- ${highlyAfferentModules} modules have high incoming dependencies (>10)\n`;
      }

      const highlyEfferentModules = result.couplingMetrics.filter(
        (m) => m.efferentCoupling > 10
      ).length;
      if (highlyEfferentModules > 0) {
        explanation += `- ${highlyEfferentModules} modules have high outgoing dependencies (>10)\n`;
      }

      const unstableImportantModules = result.couplingMetrics.filter(
        (m) => m.instability > 0.7 && m.afferentCoupling > 3
      ).length;

      if (unstableImportantModules > 0) {
        explanation += `- ${unstableImportantModules} important modules have high instability\n`;
      }
    }

    return explanation;
  }

  /**
   * Analyze the distribution of a metric to determine skew
   */
  private analyzeDistribution(values: number[]): { mean: number; median: number; skew: number } {
    if (values.length === 0) {
      return { mean: 0, median: 0, skew: 0 };
    }

    // Calculate mean
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    // Calculate median
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];

    // Calculate skew (simplified approximation using mean/median ratio)
    const skew = mean / (median || 1);

    return { mean, median, skew };
  }
}

export function registerArchitectureAnalyzerTool(server: McpServer): void {
  const tool = new ArchitectureAnalyzerTool();
  tool.register(server);
  // Removed redundant logInfo call, as BaseTool.register() already logs success.
}
