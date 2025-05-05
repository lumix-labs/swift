"use client";

import { Message, MessageArtifact, Sender, SenderType } from "../../lib/types/message";

// Define message types that should be excluded when sending to model
export const EXCLUDED_MESSAGE_SENDERS = [SenderType.SWIFT_ASSISTANT];
export const EXCLUDED_MESSAGE_ROLES = ["assistant-informational"];

// Define chat session type
export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  aiAdvisorId?: string;
  repositoryId?: string;
  modelId?: string; // Add modelId for backward compatibility
}

// Define saved session interface for localStorage
export interface SavedSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    sender: {
      id: string;
      type: SenderType;
      name: string;
      avatarUrl: string;
      includeInModelContext: boolean;
    };
    content: string;
    timestamp: string;
    artifacts?: MessageArtifact[];
    status?: "sending" | "delivered" | "error";
    isMarkdown?: boolean;
    role?: string; // Add role for backward compatibility
  }>;
  aiAdvisorId?: string;
  repositoryId?: string;
  modelId?: string; // Add modelId for backward compatibility
}

// Define the context type
export interface ChatContextType {
  messages: Message[];
  // Update the addMessage interface to include sender property
  addMessage: (message: { role: string; content: string; sender?: Sender }) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  selectedAIAdvisorId: string | null;
  setSelectedAIAdvisorId: (aiAdvisorId: string | null) => void;
  selectedRepositoryId: string | null;
  setSelectedRepositoryId: (repoId: string | null) => void;
  selectedModelId?: string | null; // Add for backward compatibility
}

// Maximum number of sessions to keep in storage
export const MAX_SESSIONS = 5;
