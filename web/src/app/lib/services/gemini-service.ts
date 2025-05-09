"use client";

import { EXCLUDED_MESSAGE_ROLES, EXCLUDED_MESSAGE_SENDERS } from "../../context/chat/types";
import { BaseModelService } from "./base-model-service";
import { Personality } from "../types/personality";
import { DependencyGraph, ApiSurface } from "./repo-analysis-service";
import { FileMetadata } from "../../types/repository";

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

export class GeminiService extends BaseModelService {
  private apiUrl: string;

  constructor(apiKey: string, personality?: Personality) {
    super(apiKey);
    // Using Gemini 1.5 Flash model, which uses less credits and is more cost-effective
    this.apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

    // Set personality if provided
    if (personality) {
      this.setPersonality(personality);
    }
  }

  /**
   * Get the provider name for logging
   */
  protected getProviderName(): string {
    return "Gemini";
  }

  /**
   * Prepare system message with repository context
   */
  private prepareSystemMessage(repoContext?: string | null): {
    parts: { text: string }[];
    role: string;
  } {
    // Start with our main context template or personality prompt
    let systemMessage = this.getSystemPrompt();

    // Append repository-specific context if available
    if (repoContext) {
      systemMessage += "\n\n" + repoContext;
    } else if (this.repositoryContext) {
      // Reuse stored repository context if available
      systemMessage += "\n\n" + this.repositoryContext;
    }

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
   * Sends a message to Gemini API and receives a response
   */
  async sendMessage(
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
  ): Promise<string> {
    try {
      console.warn("Sending message to Gemini API:", {
        messageLength: message.length,
        hasRepoContext: Boolean(repoName && repoUrl),
        readmeContentLength: readmeContent?.length || 0,
        hasRepoTree: Boolean(repoTree),
        hasDetailedTree: Boolean(detailedTree),
        hasDependencyGraph: Boolean(dependencyGraph),
        hasApiSurface: Boolean(apiSurface),
        hasFileMetadata: Boolean(fileMetadata),
        hasDirectoryMetadata: Boolean(directoryMetadata),
        hasPersonalityPrompt: Boolean(this.personalityPrompt),
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
        repoContext = this.formatRepoContext(
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
        console.log("===== GEMINI REQUEST =====");
        console.log(JSON.stringify(requestBody, null, 2));
        console.log("==========================");
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
        console.log("===== GEMINI RESPONSE =====");
        console.log(JSON.stringify(data, null, 2));
        console.log("===========================");
      }

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response generated by Gemini API.");
      }

      let generatedText = data.candidates[0].content.parts.map((part) => part.text).join("");

      // Process the response to ensure brevity if needed
      generatedText = this.ensureBriefResponse(generatedText);

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
}
