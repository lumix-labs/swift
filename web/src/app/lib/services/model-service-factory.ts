"use client";

import { BaseModelService } from "./base-model-service";
import { ClaudeService } from "./claude-service";
import { GeminiService } from "./gemini-service";
import { OpenAIService } from "./openai-service";
import { Personality } from "../types/personality";
import { getModelById } from "./entity-service";

export type ModelServiceType = "claude" | "gemini" | "openai";

/**
 * Factory for creating model service instances
 */
export class ModelServiceFactory {
  /**
   * Create a model service instance based on the model type
   * @param type Model service type to create
   * @param apiKey API key for the service
   * @param modelId Specific model ID to use (optional)
   * @returns Instance of a concrete model service
   */
  static createService(type: ModelServiceType, apiKey: string, modelId?: string): BaseModelService {
    // Check if model has a personality
    let personality: Personality | undefined = undefined;

    if (modelId) {
      const model = getModelById(modelId);
      if (model && model.personality) {
        personality = model.personality;
      }
    }

    switch (type) {
      case "claude":
        return new ClaudeService(apiKey, modelId || "claude-3-haiku-20240307", personality);
      case "gemini":
        return new GeminiService(apiKey, personality);
      case "openai":
        return new OpenAIService(apiKey, modelId || "gpt-3.5-turbo", personality);
      default:
        // Use type assertion to handle type checking
        throw new Error(`Unsupported model type: ${type as string}`);
    }
  }

  /**
   * Determine the service type from a model ID
   * @param modelId The model ID to check
   * @returns The corresponding service type
   */
  static getServiceTypeFromModelId(modelId: string): ModelServiceType {
    if (modelId.includes("claude")) {
      return "claude";
    } else if (modelId.includes("gemini")) {
      return "gemini";
    } else if (modelId.includes("gpt")) {
      return "openai";
    }

    // Default to gemini if unable to determine
    console.warn(`Unable to determine service type from model ID: ${modelId}, defaulting to gemini`);
    return "gemini";
  }
}
