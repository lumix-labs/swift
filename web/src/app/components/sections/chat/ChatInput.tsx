"use client";

import React, { useRef } from "react";
import { MessageInput } from "./MessageInput";
import { InputControls } from "./InputControls";
import { StatusIndicator } from "./StatusIndicator";
import { useChatInputState } from "../../../hooks/chat/useChatInputState";
import { useTextareaResize } from "../../../hooks/chat/useTextareaResize";

export function ChatInput() {
  // Use custom hook to manage input state logic
  const {
    message,
    setMessage,
    isInputDisabled,
    currentModel,
    currentRepo,
    repositoryReady,
    repositoryStatus,
    errorMessage,
    handleSubmit,
    handleMessageChange,
    handleKeyDown,
    getPlaceholderMessage,
  } = useChatInputState();

  // Reference to the textarea element
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get resize functionality for the textarea
  const { resetTextareaHeight, resizeTextarea } = useTextareaResize(textareaRef, message);

  // Enhanced validation to ensure both AI advisor and repository are selected
  const isChatEnabled = currentModel && currentRepo && repositoryReady;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Status and error messages */}
      <StatusIndicator
        errorMessage={errorMessage}
        currentModel={currentModel}
        currentRepo={currentRepo}
        repositoryStatus={repositoryStatus}
        repositoryReady={repositoryReady}
      />

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-center gap-1 w-full">
        {/* Text input area */}
        <MessageInput
          message={message}
          isDisabled={isInputDisabled || !isChatEnabled}
          placeholderMessage={getPlaceholderMessage()}
          handleMessageChange={handleMessageChange}
          handleKeyDown={handleKeyDown}
          resizeTextarea={resizeTextarea}
          setMessage={setMessage}
        />

        {/* Send button */}
        <InputControls isDisabled={isInputDisabled || !isChatEnabled} isInputEmpty={!message.trim()} />
      </form>
    </div>
  );
}
