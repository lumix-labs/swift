"use client";

import { ModelServiceFactory, ModelServiceType, BaseModelService } from "../services";
import { getModelById } from "../services/entity-service";

// Cache of model service instances to prevent creating new instances
const serviceCache = new Map<string, BaseModelService>();

/**
 * Get a model service instance based on the model type and API key
 * This uses a factory pattern and caches instances for better performance
 *
 * @param modelId The model ID to use
 * @param apiKey The API key for authentication
 * @returns An instance of the appropriate model service
 */
export function getModelService(modelId: string, apiKey: string): BaseModelService {
  // Get the model to check for personality
  const model = getModelById(modelId);

  // Create a cache key based on the model ID, API key, and personality (if present)
  const personalityStr = model?.personality ? `-${model.personality}` : "";
  const cacheKey = `${modelId}:${apiKey}${personalityStr}`;

  // Check if we already have an instance in the cache
  if (serviceCache.has(cacheKey)) {
    return serviceCache.get(cacheKey)!;
  }

  // Determine the service type from the model ID
  const serviceType = ModelServiceFactory.getServiceTypeFromModelId(modelId);

  // Create a new service instance
  const service = ModelServiceFactory.createService(serviceType, apiKey, modelId);

  // Cache the instance for future use
  serviceCache.set(cacheKey, service);

  return service;
}
