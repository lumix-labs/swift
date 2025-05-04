"use client";

// Define message types
export interface Message {
  id: string;
  role: "user" | "assistant" | "assistant-informational" | "model-response";
  content: string;
  timestamp: Date;
}

// Define message roles that should be excluded when sending to model
export const EXCLUDED_MESSAGE_ROLES = ["assistant-informational"];

// Define chat session type
export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  modelId?: string;
  repositoryId?: string;
}

// Define saved session interface for localStorage
export interface SavedSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant" | "assistant-informational" | "model-response";
    content: string;
    timestamp: string;
  }>;
  modelId?: string;
  repositoryId?: string;
}

// Define the context type
export interface ChatContextType {
  messages: Message[];
  addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  selectedModelId: string | null;
  setSelectedModelId: (modelId: string | null) => void;
  selectedRepositoryId: string | null;
  setSelectedRepositoryId: (repoId: string | null) => void;
}

// Maximum number of sessions to keep in storage
export const MAX_SESSIONS = 5;
