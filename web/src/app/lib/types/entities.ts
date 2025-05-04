export interface Repository {
  id: string;
  name: string;
  url: string;
}

export interface LLMModel {
  id: string;
  name: string;
  provider: "gemini" | "anthropic";
  apiKey: string;
}

export type LLMProvider = "gemini" | "anthropic";
