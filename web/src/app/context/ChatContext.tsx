"use client";

import { ChatProvider, useChat } from "./chat/ChatContextProvider";
import { Message as MessageType } from "../lib/types/message";

// Re-export the Message type directly from the lib types
export type Message = MessageType;
export type { ChatSession, ChatContextType } from "./chat/types";
export { ChatProvider, useChat };
