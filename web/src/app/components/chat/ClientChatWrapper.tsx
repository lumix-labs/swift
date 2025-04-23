"use client"

import { ChatProvider } from 'src/app/context/ChatContext';
import { ChatLayout } from './ChatLayout';

export function ClientChatWrapper() {
  return (
    <ChatProvider>
      <ChatLayout />
    </ChatProvider>
  );
}
