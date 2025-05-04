"use client";

import { ChatProvider } from "../../../context/ChatContext";
import { ChatLayout } from "./ChatLayout";

export function ClientChatWrapper() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
