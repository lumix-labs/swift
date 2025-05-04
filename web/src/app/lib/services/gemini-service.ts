"use client";

import { EXCLUDED_MESSAGE_ROLES } from "../../context/chat/types";

/**
 * Gemini service for handling communication with Google's Gemini API
 */

interface GeminiRequestBody {
  contents: {
    parts: {
      text: string;
    }[];
    role: string;
  }[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
  };
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
      role: string;
    };
    finishReason: string;
    index: number;
  }[];
}

export class GeminiService {
  private apiUrl: string;
  private apiKey: string;
  private previousMessages: { role: string; content: string }[] = [];
  private repositoryContext: string | null = null;
  private debug: boolean = true; // Enable debug logging by default

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Using Gemini 1.5 Flash model, which uses less credits and is more cost-effective
    this.apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
    
    // Listen for debug toggle events
    if (typeof window !== 'undefined') {
      // Try to load debug state from localStorage
      try {
        const savedState = localStorage.getItem('swift_debug_mode');
        if (savedState) {
          this.debug = savedState === 'true';
          console.log(`Gemini service debug mode initialized: ${this.debug}`);
        }
      } catch (error) {
        console.error('Failed to load debug preference:', error);
      }
      
      // Set up event listener for debug toggle
      window.addEventListener('swift_debug_toggle', ((event: CustomEvent) => {
        this.debug = event.detail.enabled;
        console.log(`Gemini service debug mode set to: ${this.debug}`);
      }) as EventListener);
    }
  }

  /**
   * Format repository context for the prompt
   */
  private formatRepoContext(repoName: string, repoUrl: string, readmeContent?: string, repoTree?: string): string {
    let context = `You are assisting with a code repository: ${repoName} (${repoUrl}).\n\n`;

    // Add repository tree if available
    if (repoTree) {
      context += `Repository file structure (respecting .gitignore):\n\`\`\`\n${repoTree}\n\`\`\`\n\n`;
    }

    if (readmeContent) {
      // Limit README content to avoid token limits
      const truncatedReadme =
        readmeContent.length > 10000
          ? readmeContent.substring(0, 10000) + "... [README truncated due to length]"
          : readmeContent;

      context += `Repository README content:\n\`\`\`markdown\n${truncatedReadme}\n\`\`\`\n\n`;
    }

    context +=
      "Please provide helpful and detailed answers based on this repository context. When referring to code from the repository, use proper formatting with code blocks.";

    // Store the repository context for reuse
    this.repositoryContext = context;

    return context;
  }

  /**
   * Prepare system message with repository context
   */
  private prepareSystemMessage(repoContext?: string | null): {
    parts: { text: string }[];
    role: string;
  } {
    let systemMessage = "You are a helpful coding assistant. ";

    if (repoContext) {
      systemMessage += repoContext;
    } else if (this.repositoryContext) {
      // Reuse stored repository context if available
      systemMessage += this.repositoryContext;
    } else {
      systemMessage += "You help users with programming questions and provide code examples when appropriate.";
    }

    // Add instructions for code formatting
    systemMessage += " When sharing code, use markdown format with language-specific syntax highlighting.";

    return {
      parts: [{ text: systemMessage }],
      role: "model",
    };
  }

  /**
   * Adds the current conversation to the message for context
   * Filters out any message roles that should be excluded
   */
  private addConversationContext(messageContent: string): string {
    if (this.previousMessages.length === 0) {
      return messageContent;
    }

    // Include up to 5 previous message pairs for context
    const maxContextPairs = 5;
    // Filter out excluded message roles
    const filteredMessages = this.previousMessages.filter((msg) => !EXCLUDED_MESSAGE_ROLES.includes(msg.role as any));
    const contextMessages = filteredMessages.slice(-maxContextPairs * 2);

    let context = "Previous conversation:\n";

    contextMessages.forEach((msg) => {
      const role =
        msg.role === "user"
          ? "User"
          : msg.role === "model-response"
            ? "Assistant"
            : msg.role === "assistant"
              ? "Assistant"
              : "System";
      context += `${role}: ${msg.content}\n\n`;
    });

    context += "Current question:\n" + messageContent;

    return context;
  }

  /**
   * Toggle debug mode for logging requests and responses
   */
  setDebugMode(enabled: boolean): void {
    this.debug = enabled;
    console.log(`Gemini debug mode ${enabled ? 'enabled' : 'disabled'}`);
    
    // Store in localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('swift_debug_mode', enabled ? 'true' : 'false');
      } catch (error) {
        console.error('Failed to save debug preference:', error);
      }
    }
  }

  /**
   * Sends a message to Gemini API and receives a response
   */
  async sendMessage(
    message: string,
    repoName?: string,
    repoUrl?: string,
    readmeContent?: string,
    repoTree?: string,
  ): Promise<string> {
    try {
      console.warn("Sending message to Gemini API:", {
        messageLength: message.length,
        hasRepoContext: Boolean(repoName && repoUrl),
        readmeContentLength: readmeContent?.length || 0,
        hasRepoTree: Boolean(repoTree),
      });

      // Add repository context if available
      let repoContext = this.repositoryContext;
      if (repoName && repoUrl) {
        // Generate new repository context if repository parameters are provided
        repoContext = this.formatRepoContext(repoName, repoUrl, readmeContent, repoTree);
      }

      // Add conversation context to the message
      const messageWithContext = this.addConversationContext(message);

      // Prepare request body with system message and user query
      const requestBody: GeminiRequestBody = {
        contents: [
          this.prepareSystemMessage(repoContext),
          {
            parts: [{ text: messageWithContext }],
            role: "user",
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096, // Increased token limit
          topP: 0.95,
          topK: 40,
        },
      };

      // Debug logging for full request
      if (this.debug) {
        console.log('===== GEMINI REQUEST =====');
        console.log(JSON.stringify(requestBody, null, 2));
        console.log('==========================');
      }

      console.warn("Calling Gemini API with repository context...");
      const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        // Try to parse error message from response
        let errorMsg = `Gemini API error: ${response.status}`;
        try {
          const errData = await response.json();
          console.error("Gemini API error details:", errData);
          if (errData && errData.error && errData.error.message) {
            errorMsg = `Gemini API error: ${errData.error.message}`;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }

        throw new Error(errorMsg);
      }

      const data = (await response.json()) as GeminiResponse;
      console.warn("Received response from Gemini API");

      // Debug logging for full response
      if (this.debug) {
        console.log('===== GEMINI RESPONSE =====');
        console.log(JSON.stringify(data, null, 2));
        console.log('===========================');
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response generated by Gemini API.");
      }

      const generatedText = data.candidates[0].content.parts.map((part) => part.text).join("");

      // Store messages for conversation context
      this.previousMessages.push({ role: "user", content: message });
      this.previousMessages.push({ role: "model-response", content: generatedText });

      // Limit conversation history to last 10 messages (5 exchanges)
      if (this.previousMessages.length > 10) {
        this.previousMessages = this.previousMessages.slice(-10);
      }

      return generatedText;
    } catch (error: unknown) {
      console.error("Error in Gemini service:", error);

      if (error instanceof Error) {
        throw new Error(error.message || "Sorry, something went wrong while communicating with the Gemini API.");
      }

      throw new Error("Sorry, something went wrong while communicating with the Gemini API.");
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
  updateRepositoryContext(repoName: string, repoUrl: string, readmeContent?: string, repoTree?: string): void {
    this.formatRepoContext(repoName, repoUrl, readmeContent, repoTree);
    console.warn("Repository context updated for:", repoName);
  }
}
