export interface Repository {
  id: string;
  name: string;
  url: string;
}

export type LLMProvider = "gemini" | "anthropic" | "openai";

// Expanded model type with more fields for better display
export interface LLMModel {
  id: string;
  name: string; // Display name
  provider: LLMProvider; // Which company provides the model
  apiKey: string; // API key for authentication
  modelId?: string; // Actual model ID used in API calls (e.g., "gemini-1.5-flash", "claude-3-opus")
  description?: string; // Short description of the model's capabilities
  maxTokens?: number; // Maximum context length
  icon?: string; // Icon path for the model
  isDefault?: boolean; // Whether this is the default model
}

// Predefined models to improve user experience
export const PREDEFINED_MODELS: Partial<LLMModel>[] = [
  {
    name: "Gemini Pro",
    provider: "gemini",
    modelId: "gemini-1.5-pro",
    description: "Google's advanced model for complex tasks",
    maxTokens: 16000,
    icon: "/avatars/gemini-avatar.png",
  },
  {
    name: "Gemini Flash",
    provider: "gemini",
    modelId: "gemini-1.5-flash",
    description: "Fast responses with good accuracy",
    maxTokens: 16000,
    icon: "/avatars/gemini-avatar.png",
    isDefault: true,
  },
  {
    name: "Claude Opus",
    provider: "anthropic",
    modelId: "claude-3-opus-20240229",
    description: "Anthropic's most powerful model",
    maxTokens: 32000,
    icon: "/avatars/claude-avatar.png",
  },
  {
    name: "Claude Haiku",
    provider: "anthropic",
    modelId: "claude-3-haiku-20240307",
    description: "Fast, efficient responses",
    maxTokens: 48000,
    icon: "/avatars/claude-avatar.png",
  },
  {
    name: "GPT-4 Turbo",
    provider: "openai",
    modelId: "gpt-4-turbo-preview",
    description: "OpenAI's most advanced model",
    maxTokens: 128000,
    icon: "/avatars/openai-avatar.png",
  },
  {
    name: "GPT-3.5 Turbo",
    provider: "openai",
    modelId: "gpt-3.5-turbo",
    description: "Fast and cost-effective",
    maxTokens: 16000,
    icon: "/avatars/openai-avatar.png",
  },
];
