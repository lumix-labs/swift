"use client";

import { Message } from "../types/message";
import { Personality, PERSONALITY_PROFILES } from "../types/personality";
import { DependencyGraph, ApiSurface } from "./repo-analysis-service";
import { FileMetadata } from "../../types/repository";

/**
 * Response types for various model providers
 */
export interface ModelResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Repository context information
 */
export interface RepositoryContext {
  repoName: string;
  repoUrl: string;
  readmeContent?: string;
  repoTree?: string;
  repoLocalPath?: string;
  detailedTree?: any; // Added to support detailed repository data
  dependencyGraph?: DependencyGraph; // Added dependency graph
  apiSurface?: ApiSurface; // Added API surface analysis
  fileMetadata?: Record<string, FileMetadata>; // Added file metrics
  directoryMetadata?: Record<string, FileMetadata>; // Added directory metrics
  configFiles?: Record<string, string>;
}

/**
 * Base model service interface
 */
export abstract class BaseModelService {
  protected apiKey: string;
  protected debug: boolean = false;
  protected previousMessages: { role: string; content: string }[] = [];
  protected repositoryContext: string | null = null;
  protected contextTemplate: string;
  protected personalityPrompt: string | null = null;

  constructor(apiKey: string, personality?: Personality) {
    this.apiKey = apiKey;

    // Default context template for all models
    this.contextTemplate = `
You are Swift AI, an expert code interpreter and technical advisor with a talent for explaining complex technical concepts in simple terms.

PRIMARY MISSION:
Help non-technical leaders and executives understand their codebase without requiring programming expertise. Translate technical details into business implications and strategic insights.

PERSONALITY:
- Approachable and jargon-free: Explain technical concepts using plain language and relevant business analogies
- Strategic: Focus on how code relates to business goals, not just technical implementation
- Concise: Provide clear, actionable insights without overwhelming technical details
- Patient: Meet users at their technical level and never make them feel inadequate

RESPONSE GUIDELINES:
- Be conversational, brief, and human-like in your responses
- Always start with a short, valuable insight (1-2 sentences) that shows you understood the question
- Format your most important points in bold for easy scanning
- Only give necessary details initially - if the user wants more information, they'll ask
- Make responses balanced like a WhatsApp conversation - not too long, not too short
- Use markdown formatting to improve readability (headers, lists, code blocks)
- When explaining code, focus on business impact rather than implementation details
- Use analogies to relate technical concepts to familiar business scenarios

IMPORTANT: Provide responses under 200 words whenever possible. Focus on key insights and actionable points. Never mention in your responses that you are trying to be concise.

FORMATTING NOTE: When applying formatting such as bold, italics, or headers, use the markdown symbols (**, *, ##) but remember these symbols are not visible to the user - they only affect how the text appears. Never reference markdown formatting in your responses.
`;

    // Set personality prompt if provided
    if (personality) {
      this.setPersonality(personality);
    }

    // Initialize debug mode from localStorage
    this.initializeDebugMode();
  }

  /**
   * Set the personality for this model service
   */
  setPersonality(personality: Personality): void {
    const profile = PERSONALITY_PROFILES[personality];

    if (profile) {
      this.personalityPrompt = profile.prompt;
      console.log(`${this.getProviderName()} personality set to ${personality}`);
    } else {
      console.warn(`Unknown personality: ${personality}`);
      this.personalityPrompt = null;
    }
  }

  /**
   * Get the current system prompt including personality if set
   */
  protected getSystemPrompt(): string {
    if (this.personalityPrompt) {
      // Add conciseness instruction to personality prompt
      return (
        this.personalityPrompt +
        "\n\nIMPORTANT: Provide responses under 200 words whenever possible. Focus on key insights and actionable points. Never mention in your responses that you are trying to be concise.\n\nFORMATTING NOTE: When applying formatting such as bold, italics, or headers, use the markdown symbols (**, *, ##) but remember these symbols are not visible to the user - they only affect how the text appears. Never reference markdown formatting in your responses."
      );
    }
    return this.contextTemplate;
  }

  /**
   * Initialize debug mode from localStorage
   */
  private initializeDebugMode(): void {
    if (typeof window !== "undefined") {
      try {
        const savedState = localStorage.getItem("swift_debug_mode");
        if (savedState) {
          this.debug = savedState === "true";
          console.log(`${this.getProviderName()} service debug mode initialized: ${this.debug}`);
        }
      } catch (error) {
        console.error("Failed to load debug preference:", error);
      }

      // Set up event listener for debug toggle
      window.addEventListener("swift_debug_toggle", ((event: CustomEvent) => {
        this.debug = event.detail.enabled;
        console.log(`${this.getProviderName()} service debug mode set to: ${this.debug}`);
      }) as EventListener);
    }
  }

  /**
   * Get the provider name for logging
   */
  protected abstract getProviderName(): string;

  /**
   * Format repository context for the prompt
   */
  protected formatRepoContext(
    repoName: string,
    repoUrl: string,
    readmeContent?: string,
    repoTree?: string,
    configFiles?: Record<string, string>,
    detailedTree?: any,
    dependencyGraph?: DependencyGraph,
    apiSurface?: ApiSurface,
    fileMetadata?: Record<string, FileMetadata>,
    directoryMetadata?: Record<string, FileMetadata>,
  ): string {
    let context = `You are assisting with a code repository: ${repoName} (${repoUrl}).\n\n`;

    // Add repository tree if available
    if (repoTree) {
      context += `Repository file structure (respecting .gitignore):\n\`\`\`\n${repoTree}\n\`\`\`\n\n`;
    }

    // Add README content if available
    if (readmeContent) {
      // Limit README content to avoid token limits
      const truncatedReadme =
        readmeContent.length > 8000
          ? readmeContent.substring(0, 8000) + "... [README truncated due to length]"
          : readmeContent;

      context += `Repository README content:\n\`\`\`markdown\n${truncatedReadme}\n\`\`\`\n\n`;
    }

    // Add detailed tree if available - include only a summary to avoid token limits
    if (detailedTree) {
      let detailedTreeSummary = "Repository detailed structure available with code organization information including:";

      // Add a summary of what's in the detailed tree
      detailedTreeSummary += "\n- Class and method hierarchies";
      detailedTreeSummary += "\n- Function definitions";
      detailedTreeSummary += "\n- Code organization by file and folder";
      detailedTreeSummary += "\n- Language-specific parsing of code structures";

      context += `\n${detailedTreeSummary}\n\n`;

      // Log the size of the detailed tree for debugging
      console.log(`[${this.getProviderName()}] Detailed tree size: ${JSON.stringify(detailedTree).length} characters`);
    }

    // Add dependency graph summary if available
    if (dependencyGraph) {
      const nodeCount = Object.keys(dependencyGraph.nodes).length;
      let dependencyGraphSummary = `Dependency Graph Analysis (${nodeCount} modules detected):`;

      // Add summary of key dependencies
      dependencyGraphSummary += "\n- Module dependencies and relationships";
      dependencyGraphSummary += "\n- Incoming and outgoing dependencies for each module";

      // Find most depended-upon modules (highest incoming dependencies)
      const mostDependedModules = Object.values(dependencyGraph.nodes)
        .sort((a, b) => b.incomingDependencies.length - a.incomingDependencies.length)
        .slice(0, 5);

      if (mostDependedModules.length > 0) {
        dependencyGraphSummary += "\n\nMost central modules (highest incoming dependencies):";
        mostDependedModules.forEach((module) => {
          dependencyGraphSummary += `\n- ${module.name} (${module.incomingDependencies.length} dependencies)`;
        });
      }

      context += `${dependencyGraphSummary}\n\n`;

      // Log dependency graph size for debugging
      console.log(
        `[${this.getProviderName()}] Dependency graph size: ${JSON.stringify(dependencyGraph).length} characters`,
      );
    }

    // Add API surface analysis if available
    if (apiSurface) {
      let apiSurfaceSummary = "API Surface Analysis:";

      // Add API endpoints summary
      if (apiSurface.endpoints.length > 0) {
        apiSurfaceSummary += `\n- ${apiSurface.endpoints.length} API endpoints identified`;

        // Group endpoints by HTTP method
        const methodGroups: Record<string, number> = {};
        apiSurface.endpoints.forEach((endpoint) => {
          methodGroups[endpoint.method] = (methodGroups[endpoint.method] || 0) + 1;
        });

        // List endpoints by method
        Object.entries(methodGroups).forEach(([method, count]) => {
          apiSurfaceSummary += `\n  - ${method}: ${count} endpoints`;
        });
      }

      // Add public libraries summary
      if (apiSurface.libraries.length > 0) {
        apiSurfaceSummary += `\n- ${apiSurface.libraries.length} public libraries/modules identified`;

        // Count exports by type
        const exportTypes: Record<string, number> = {};
        apiSurface.libraries.forEach((lib) => {
          lib.exports.forEach((exp) => {
            exportTypes[exp.type] = (exportTypes[exp.type] || 0) + 1;
          });
        });

        // List export types
        Object.entries(exportTypes).forEach(([type, count]) => {
          apiSurfaceSummary += `\n  - ${count} ${type}s exported`;
        });
      }

      context += `${apiSurfaceSummary}\n\n`;

      // Log API surface size for debugging
      console.log(`[${this.getProviderName()}] API surface size: ${JSON.stringify(apiSurface).length} characters`);
    }

    // Add file and directory metadata if available
    if (fileMetadata && directoryMetadata) {
      let metadataSummary = "Repository Code Metrics:";

      // Calculate overall stats
      const totalFiles = Object.keys(fileMetadata).length;
      let totalLines = 0;
      let totalBytes = 0;
      const languageCounts: Record<string, number> = {};

      // Gather statistics from files
      Object.values(fileMetadata).forEach((meta) => {
        totalLines += meta.lineCount;
        totalBytes = meta.byteSize;

        const language = Array.isArray(meta.language) ? "Mixed" : meta.language;
        languageCounts[language] = (languageCounts[language] || 0) + 1;
      });

      // Add overall stats
      metadataSummary += `\n- Total Files: ${totalFiles}`;
      metadataSummary += `\n- Lines of Code: ${totalLines.toLocaleString()}`;
      metadataSummary += `\n- Repository Size: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;

      // Add language breakdown
      metadataSummary += "\n- Language Distribution:";
      Object.entries(languageCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .forEach(([language, count]) => {
          const percentage = ((count / totalFiles) * 100).toFixed(1);
          metadataSummary += `\n  - ${language}: ${count} files (${percentage}%)`;
        });

      // Add directories with most code
      metadataSummary += "\n- Top Directories by Lines of Code:";
      const topDirs = Object.entries(directoryMetadata)
        .sort(([, a], [, b]) => b.lineCount - a.lineCount)
        .slice(0, 5);

      topDirs.forEach(([dirPath, meta]) => {
        metadataSummary += `\n  - ${dirPath}: ${meta.lineCount.toLocaleString()} lines`;
      });

      context += `${metadataSummary}\n\n`;

      // Log metadata size for debugging
      console.log(
        `[${this.getProviderName()}] File metadata size: ${JSON.stringify(fileMetadata).length} characters, Directory metadata size: ${JSON.stringify(directoryMetadata).length} characters`,
      );
    }

    // Add important config files if available
    if (configFiles) {
      // Handle package.json
      if (configFiles.packageJson) {
        context += `package.json:\n\`\`\`json\n${configFiles.packageJson}\n\`\`\`\n\n`;
      }

      // Handle requirements.txt
      if (configFiles.requirementsTxt) {
        context += `requirements.txt:\n\`\`\`\n${configFiles.requirementsTxt}\n\`\`\`\n\n`;
      }

      // Handle .gitignore
      if (configFiles.gitignore) {
        context += `.gitignore:\n\`\`\`\n${configFiles.gitignore}\n\`\`\`\n\n`;
      }

      // Handle Dockerfile
      if (configFiles.dockerfile) {
        context += `Dockerfile:\n\`\`\`dockerfile\n${configFiles.dockerfile}\n\`\`\`\n\n`;
      }
    }

    context +=
      "Please provide helpful and detailed answers based on this repository context. When referring to code from the repository, use proper formatting with code blocks. Remember to focus on explaining technical concepts in business terms.";

    // Store the repository context for reuse
    this.repositoryContext = context;

    return context;
  }

  /**
   * Extract important config files from repository tree
   */
  protected async extractConfigFiles(repoTree: string, repoLocalPath: string): Promise<Record<string, string>> {
    const configFiles: Record<string, string> = {};
    const lines = repoTree.split("\n");
    const importantFiles = [
      "package.json",
      "requirements.txt",
      ".gitignore",
      "Dockerfile",
      "docker-compose.yml",
      "tsconfig.json",
      ".env.example",
      "PRD.md",
    ];

    // Collect paths that match important files
    const filesToExtract: Record<string, string> = {};

    for (const line of lines) {
      for (const file of importantFiles) {
        if (line.includes(file)) {
          // Format varies, but we're looking for the file path
          const match = line.match(/([^\s|]+)$/);
          if (match && match[1]) {
            const path = match[1].trim();
            if (path.endsWith(file)) {
              filesToExtract[file] = path;
            }
          }
        }
      }
    }

    // We would read files here if we had direct filesystem access
    // Since this is client-side, we would need to implement file reading via API
    // For now, we'll just return the empty object

    return configFiles;
  }

  /**
   * Toggle debug mode for logging requests and responses
   */
  setDebugMode(enabled: boolean): void {
    this.debug = enabled;
    console.log(`${this.getProviderName()} debug mode ${enabled ? "enabled" : "disabled"}`);

    // Store in localStorage
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("swift_debug_mode", enabled ? "true" : "false");
      } catch (error) {
        console.error("Failed to save debug preference:", error);
      }
    }
  }

  /**
   * Clears the conversation history and repository context
   */
  clearConversation(): void {
    this.previousMessages = [];
    this.repositoryContext = null;
  }

  /**
   * Updates the repository context without sending a message
   */
  updateRepositoryContext(
    repoName: string,
    repoUrl: string,
    readmeContent?: string,
    repoTree?: string,
    repoLocalPath?: string,
    detailedTree?: any,
    dependencyGraph?: DependencyGraph,
    apiSurface?: ApiSurface,
    fileMetadata?: Record<string, FileMetadata>,
    directoryMetadata?: Record<string, FileMetadata>,
  ): void {
    if (repoLocalPath) {
      // If local path is provided, try to extract config files
      this.extractConfigFiles(repoTree || "", repoLocalPath)
        .then((configFiles) => {
          this.formatRepoContext(
            repoName,
            repoUrl,
            readmeContent,
            repoTree,
            configFiles,
            detailedTree,
            dependencyGraph,
            apiSurface,
            fileMetadata,
            directoryMetadata,
          );
          console.warn("Repository context updated for:", repoName);
        })
        .catch((error) => {
          console.error("Error extracting config files:", error);
          // Fall back to basic context if extraction fails
          this.formatRepoContext(
            repoName,
            repoUrl,
            readmeContent,
            repoTree,
            undefined,
            detailedTree,
            dependencyGraph,
            apiSurface,
            fileMetadata,
            directoryMetadata,
          );
          console.warn("Repository context updated for:", repoName);
        });
    } else {
      // Basic context without config files
      this.formatRepoContext(
        repoName,
        repoUrl,
        readmeContent,
        repoTree,
        undefined,
        detailedTree,
        dependencyGraph,
        apiSurface,
        fileMetadata,
        directoryMetadata,
      );
      console.warn("Repository context updated for:", repoName);
    }
  }

  /**
   * Process model response to ensure brevity
   */
  protected ensureBriefResponse(generatedText: string): string {
    // Count approximate words by splitting on spaces
    const wordCount = generatedText.split(/\s+/).length;

    // If the response is already concise, return it as is
    if (wordCount <= 250) {
      return generatedText;
    }

    // For longer responses, try to truncate at a natural stopping point
    const sentences = generatedText.match(/[^.!?]+[.!?]+/g) || [];
    let truncatedText = "";
    let currentWordCount = 0;

    // Build response sentence by sentence until we approach 200 words
    for (const sentence of sentences) {
      const sentenceWordCount = sentence.split(/\s+/).length;

      if (currentWordCount + sentenceWordCount > 200) {
        // If adding this sentence would exceed 200 words, stop here
        break;
      }

      truncatedText += sentence;
      currentWordCount += sentenceWordCount;
    }

    // If we couldn't truncate nicely with sentences, just cut at word boundary
    if (truncatedText.length === 0) {
      const words = generatedText.split(/\s+/).slice(0, 200);
      truncatedText = words.join(" ");

      // Add ellipsis to indicate truncation
      truncatedText += "...";
    }

    return truncatedText;
  }

  /**
   * Send a message to the model API and receive a response
   */
  abstract sendMessage(
    message: string,
    repoName?: string,
    repoUrl?: string,
    readmeContent?: string,
    repoTree?: string,
    repoLocalPath?: string,
    detailedTree?: any,
    dependencyGraph?: DependencyGraph,
    apiSurface?: ApiSurface,
    fileMetadata?: Record<string, FileMetadata>,
    directoryMetadata?: Record<string, FileMetadata>,
  ): Promise<string>;
}
