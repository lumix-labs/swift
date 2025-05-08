"use client";

import { ChatProvider } from "../../../context/ChatContext";
import { Chat } from "./Chat";
import { ErrorBoundary } from "../../shared/ErrorBoundary";
import StorageChecker from "../../shared/StorageChecker";

export function ClientChatWrapper() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <StorageChecker />
        <Chat />
      </ChatProvider>
    </ErrorBoundary>
  );
}
