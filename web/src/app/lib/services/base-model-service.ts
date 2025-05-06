"use client";

import { Message } from "../types/message";
import { Personality, PERSONALITY_PROFILES } from "../types/personality";

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
      return this.personalityPrompt;
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
  ): void {
    if (repoLocalPath) {
      // If local path is provided, try to extract config files
      this.extractConfigFiles(repoTree || "", repoLocalPath)
        .then((configFiles) => {
          this.formatRepoContext(repoName, repoUrl, readmeContent, repoTree, configFiles);
          console.warn("Repository context updated for:", repoName);
        })
        .catch((error) => {
          console.error("Error extracting config files:", error);
          // Fall back to basic context if extraction fails
          this.formatRepoContext(repoName, repoUrl, readmeContent, repoTree);
          console.warn("Repository context updated for:", repoName);
        });
    } else {
      // Basic context without config files
      this.formatRepoContext(repoName, repoUrl, readmeContent, repoTree);
      console.warn("Repository context updated for:", repoName);
    }
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
  ): Promise<string>;
}
