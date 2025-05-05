// Define sender enum and interface
export enum SenderType {
  USER = "user",
  SWIFT_ASSISTANT = "swift-assistant",
  GEMINI = "gemini",
  CLAUDE = "claude",
  OPENAI = "openai",
}

export interface Sender {
  id: string;
  type: SenderType;
  name: string;
  avatarUrl: string;
  includeInModelContext: boolean;
}

// Available senders in the system
export const SENDERS: Record<SenderType, Sender> = {
  [SenderType.USER]: {
    id: "user",
    type: SenderType.USER,
    name: "You",
    avatarUrl: "/avatars/user-avatar.png",
    includeInModelContext: true,
  },
  [SenderType.SWIFT_ASSISTANT]: {
    id: "swift-assistant",
    type: SenderType.SWIFT_ASSISTANT,
    name: "Swift Assistant",
    avatarUrl: "/avatars/swift-avatar.png",
    includeInModelContext: false,
  },
  [SenderType.GEMINI]: {
    id: "gemini",
    type: SenderType.GEMINI,
    name: "Gemini",
    avatarUrl: "/avatars/gemini-avatar.png",
    includeInModelContext: true,
  },
  [SenderType.CLAUDE]: {
    id: "claude",
    type: SenderType.CLAUDE,
    name: "Claude",
    avatarUrl: "/avatars/claude-avatar.png",
    includeInModelContext: true,
  },
  [SenderType.OPENAI]: {
    id: "openai",
    type: SenderType.OPENAI,
    name: "GPT",
    avatarUrl: "/avatars/openai-avatar.png",
    includeInModelContext: true,
  },
};

// Define artifact interface for rich message content
export interface MessageArtifact {
  id: string;
  type: "text" | "code" | "image" | "pdf" | "ppt" | "chart";
  content: string;
  metadata?: Record<string, any>;
}

// Define valid roles for legacy compatibility
export type MessageRole = "user" | "assistant" | "assistant-informational" | "model-response";

// Enhanced message interface with both sender and role properties
export interface Message {
  id: string;
  sender: Sender;
  content: string;
  timestamp: Date;
  artifacts?: MessageArtifact[];
  status?: "sending" | "delivered" | "error";
  isMarkdown?: boolean;
  // Add role for backward compatibility
  role?: MessageRole;
}

// Legacy role to sender type mapping for backwards compatibility
export const ROLE_TO_SENDER_TYPE: Record<string, SenderType> = {
  user: SenderType.USER,
  assistant: SenderType.SWIFT_ASSISTANT,
  "assistant-informational": SenderType.SWIFT_ASSISTANT,
  "model-response": SenderType.GEMINI,
};

// For backwards compatibility, sender type to role mapping
export const SENDER_TYPE_TO_ROLE: Record<SenderType, MessageRole> = {
  [SenderType.USER]: "user",
  [SenderType.SWIFT_ASSISTANT]: "assistant",
  [SenderType.GEMINI]: "model-response",
  [SenderType.CLAUDE]: "model-response",
  [SenderType.OPENAI]: "model-response",
};

// Define thinking states for loading animation
export const THINKING_STATES = [
  "Analyzing code...",
  "Examining repository structure...",
  "Processing codebase...",
  "Reviewing architecture patterns...",
  "Extracting business insights...",
  "Evaluating technical design...",
  "Interpreting implementation...",
  "Deconstructing development patterns...",
  "Formulating business context...",
  "Connecting technical dots...",
];
