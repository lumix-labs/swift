"use client";

import { ChatProvider } from "../../../context/ChatContext";
import { ChatLayout } from "./ChatLayout";
import ChatErrorBoundary from "../../shared/ChatErrorBoundary";

export function ClientChatWrapper() {
  return (
    <ChatErrorBoundary>
      <ChatProvider>
        <ChatLayout />
      </ChatProvider>
    </ChatErrorBoundary>
  );
}
