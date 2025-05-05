"use client";

import { EXCLUDED_MESSAGE_SENDERS } from "../../context/chat/types";
import { SenderType } from "../types/message";

/**
 * Claude service for handling communication with Anthropic's Claude API
 */

interface ClaudeRequestBody {
  model: string;
  max_tokens: number;
  messages: {
    role: string;
    content: string;
  }[];
  temperature?: number;
  system?: string;
}

interface ClaudeResponse {
  id: string;
  content: {
    type: string;
    text: string;
  }[];
  role: string;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class ClaudeService {
  private apiUrl: string;
  private apiKey: string;
  private previousMessages: { role: string; content: string }[] = [];
  private repositoryContext: string | null = null;
  private debug: boolean = true; // Enable debug logging by default
  private modelId: string;

  // Define the context template with updated instructions for more concise, conversational responses
  private contextTemplate = `
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

  constructor(apiKey: string, modelId: string = "claude-3-haiku-20240307") {
    this.apiKey = apiKey;
    this.modelId = modelId;
    this.apiUrl = "https://api.anthropic.com/v1/messages";

    // Listen for debug toggle events
    if (typeof window !== "undefined") {
      // Try to load debug state from localStorage
      try {
        const savedState = localStorage.getItem("swift_debug_mode");
        if (savedState) {
          this.debug = savedState === "true";
          console.log(`Claude service debug mode initialized: ${this.debug}`);
        }
      } catch (error) {
        console.error("Failed to load debug preference:", error);
      }

      // Set up event listener for debug toggle
      window.addEventListener("swift_debug_toggle", ((event: CustomEvent) => {
        this.debug = event.detail.enabled;
        console.log(`Claude service debug mode set to: ${this.debug}`);
      }) as EventListener);
    }
  }

  /**
   * Format repository context for the prompt
   */
  private formatRepoContext(
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
   * This is a helper method to identify and extract key config files
   */
  private async extractConfigFiles(repoTree: string, repoLocalPath: string): Promise<Record<string, string>> {
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
   * Prepare system message with repository context
   */
  private prepareSystemMessage(repoContext?: string | null): string {
    // Start with our main context template
    let systemMessage = this.contextTemplate;

    // Append repository-specific context if available
    if (repoContext) {
      systemMessage += "\n\n" + repoContext;
    } else if (this.repositoryContext) {
      // Reuse stored repository context if available
      systemMessage += "\n\n" + this.repositoryContext;
    }

    return systemMessage;
  }

  /**
   * Converts messages to Claude format
   * Filters out any message senders that should be excluded
   */
  private formatMessages(messageContent: string): { role: string; content: string }[] {
    if (this.previousMessages.length === 0) {
      return [{ role: "user", content: messageContent }];
    }

    // Filter out excluded message senders
    const filteredMessages = this.previousMessages.filter((msg) => !EXCLUDED_MESSAGE_SENDERS.includes(msg.role as any));

    // Add the current message
    const formattedMessages = [...filteredMessages, { role: "user", content: messageContent }];

    return formattedMessages;
  }

  /**
   * Toggle debug mode for logging requests and responses
   */
  setDebugMode(enabled: boolean): void {
    this.debug = enabled;
    console.log(`Claude debug mode ${enabled ? "enabled" : "disabled"}`);

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
   * Sends a message to Claude API and receives a response
   */
  async sendMessage(
    message: string,
    repoName?: string,
    repoUrl?: string,
    readmeContent?: string,
    repoTree?: string,
    repoLocalPath?: string,
  ): Promise<string> {
    try {
      console.warn("Sending message to Claude API:", {
        messageLength: message.length,
        hasRepoContext: Boolean(repoName && repoUrl),
        readmeContentLength: readmeContent?.length || 0,
        hasRepoTree: Boolean(repoTree),
        model: this.modelId,
      });

      // Add repository context if available
      let repoContext = this.repositoryContext;

      if (repoName && repoUrl) {
        // Try to extract config files if we have repository tree and path
        let configFiles = {};
        if (repoTree && repoLocalPath) {
          configFiles = await this.extractConfigFiles(repoTree, repoLocalPath);
        }

        // Generate new repository context if repository parameters are provided
        repoContext = this.formatRepoContext(repoName, repoUrl, readmeContent, repoTree, configFiles);
      }

      // Get system message with context
      const systemMessage = this.prepareSystemMessage(repoContext);

      // Format messages
      const messages = this.formatMessages(message);

      // Prepare request body
      const requestBody: ClaudeRequestBody = {
        model: this.modelId,
        max_tokens: 4000,
        messages: messages,
        temperature: 0.7,
        system: systemMessage,
      };

      // Debug logging for full request
      if (this.debug) {
        console.log("===== CLAUDE REQUEST =====");
        console.log(JSON.stringify(requestBody, null, 2));
        console.log("==========================");
      }

      console.warn("Calling Claude API with repository context...");
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMsg = `Claude API error: ${response.status}`;
        try {
          const errData = await response.json();
          console.error("Claude API error details:", errData);
          if (errData && errData.error) {
            errorMsg = `Claude API error: ${errData.error.message || JSON.stringify(errData.error)}`;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }

        throw new Error(errorMsg);
      }

      const data = (await response.json()) as ClaudeResponse;
      console.warn("Received response from Claude API");

      // Debug logging for full response
      if (this.debug) {
        console.log("===== CLAUDE RESPONSE =====");
        console.log(JSON.stringify(data, null, 2));
        console.log("===========================");
      }

      if (!data.content || data.content.length === 0) {
        throw new Error("No response generated by Claude API.");
      }

      // Extract text content from response
      let responseText = "";
      for (const content of data.content) {
        if (content.type === "text") {
          responseText += content.text;
        }
      }

      // Store messages for conversation context
      this.previousMessages.push({ role: "user", content: message });
      this.previousMessages.push({ role: "assistant", content: responseText });

      // Limit conversation history to last 10 messages (5 exchanges)
      if (this.previousMessages.length > 10) {
        this.previousMessages = this.previousMessages.slice(-10);
      }

      return responseText;
    } catch (error: unknown) {
      console.error("Error in Claude service:", error);

      if (error instanceof Error) {
        throw new Error(error.message || "Sorry, something went wrong while communicating with the Claude API.");
      }

      throw new Error("Sorry, something went wrong while communicating with the Claude API.");
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
   * Useful when switching repositories
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
}
