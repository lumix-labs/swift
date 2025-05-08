"use client";

import { ReactNode } from "react";
import { ChatProvider as NewChatProvider } from "../ChatProvider";

/**
 * @deprecated This component is deprecated and will be removed in a future version.
 * Please use the new ChatProvider from 'src/app/context/ChatProvider' instead.
 */
export function ChatContextProviderV2({ children }: { children: ReactNode }) {
  // This is just a wrapper around the new implementation
  // to make migration easier
  return <NewChatProvider>{children}</NewChatProvider>;
}
