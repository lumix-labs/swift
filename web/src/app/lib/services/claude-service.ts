"use client";

import { BaseModelService } from "./base-model-service";
import { Personality } from "../types/personality";
import { DependencyGraph, ApiSurface } from "./repo-analysis-service";
import { FileMetadata } from "../../types/repository";

/**
 * Claude service for handling communication with Anthropic's Claude API
 */
export class ClaudeService extends BaseModelService {
  private apiUrl: string;
  private modelId: string;

  constructor(apiKey: string, modelId: string = "claude-3-haiku-20240307", personality?: Personality) {
    super(apiKey, personality);
    this.apiUrl = "https://api.anthropic.com/v1/messages";
    this.modelId = modelId;
  }

  /**
   * Get the provider name for logging
   */
  protected getProviderName(): string {
    return "Claude";
  }

  /**
   * Send a message to the Claude API and receive a response
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
      console.warn("Sending message to Claude API:", {
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
        let configFiles = {};
        if (repoTree && repoLocalPath) {
          configFiles = await this.extractConfigFiles(repoTree, repoLocalPath);
        }

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

      const requestBody = {
        model: this.modelId,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        system: this.getSystemPrompt() + (repoContext ? "\n\n" + repoContext : ""),
        max_tokens: 4096,
        temperature: 0.7,
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
          "anthropic-version": "2023-06-01",
          "x-api-key": this.apiKey,
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
            errorMsg = `Claude API error: ${errData.error.message || errData.error.type}`;
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.warn("Received response from Claude API");

      // Debug logging for full response
      if (this.debug) {
        console.log("===== CLAUDE RESPONSE =====");
        console.log(JSON.stringify(data, null, 2));
        console.log("===========================");
      }

      let generatedText = data?.content?.[0]?.text || "No response generated.";

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
      console.error("Error in Claude service:", error);

      if (error instanceof Error) {
        throw new Error(error.message || "Sorry, something went wrong while communicating with the Claude API.");
      }

      throw new Error("Sorry, something went wrong while communicating with the Claude API.");
    }
  }
}
