"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Message } from "../../../context/chat/types";
import { useTheme } from "../../../context/ThemeContext";

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const [processedContent, setProcessedContent] = useState<string>(message.content);

  // Determine message type for styling
  const isUserMessage = message.role === "user";
  const isInformationalMessage = message.role === "assistant-informational";
  const isModelResponse = message.role === "model-response";
  const isAssistantMessage = message.role === "assistant" && !isInformationalMessage && !isModelResponse;

  // Parse markdown content for code blocks and links
  useEffect(() => {
    try {
      // Create a custom renderer for code blocks
      const customRenderer = {
        code(code: string, language?: string): string {
          // Use language for syntax highlighting if provided
          const validLanguage =
            language &&
            (language === "js" ||
              language === "javascript" ||
              language === "ts" ||
              language === "typescript" ||
              language === "jsx" ||
              language === "tsx" ||
              language === "html" ||
              language === "css" ||
              language === "json" ||
              language === "python" ||
              language === "bash" ||
              language === "sh" ||
              language === "java" ||
              language === "go" ||
              language === "c" ||
              language === "cpp" ||
              language === "csharp" ||
              language === "ruby");

          if (validLanguage) {
            return `<pre><code class="language-${language}">${code}</code></pre>`;
          }

          // Fall back to default rendering if not using custom highlighting
          return `<pre><code>${code}</code></pre>`;
        },
      };

      // Configure marked options
      const options = {
        breaks: true,
        gfm: true,
        headerIds: false,
        renderer: customRenderer,
      };

      // Parse the markdown content
      const rawHtml = marked(message.content, options);

      // Sanitize HTML to prevent XSS attacks
      const sanitizedHtml = DOMPurify(window).sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel"],
      });

      setProcessedContent(sanitizedHtml);
    } catch (error) {
      console.error("Error processing markdown:", error);
      setProcessedContent(message.content);
    }
  }, [message.content]);

  // Get styling based on message type
  const getMessageStyleClasses = () => {
    if (isUserMessage) {
      return "bg-white text-black dark:bg-black dark:text-white shadow-md";
    } else if (isInformationalMessage) {
      return "bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-sm";
    } else if (isModelResponse) {
      return "bg-black text-white dark:bg-white dark:text-black shadow-sm";
    } else {
      return "bg-gray-100 dark:bg-gray-800 text-black dark:text-white shadow-sm";
    }
  };

  // Get font size based on message type
  const getFontSizeClass = () => {
    if (isInformationalMessage) {
      return "text-sm";
    } else if (isUserMessage || isModelResponse || isAssistantMessage) {
      return "text-base";
    }
    return "text-base";
  };

  // Get icon based on message type
  const getMessageIcon = () => {
    if (isInformationalMessage) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-2 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else if (isModelResponse) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-2 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return null;
  };

  // Get animation class based on message type
  const getAnimationClass = () => {
    if (isInformationalMessage) {
      return "animate-fadeIn";
    } else if (isUserMessage) {
      return "animate-slideInRight";
    } else {
      return "animate-slideInLeft";
    }
  };

  return (
    <div className={`flex ${isUserMessage ? "justify-end" : "justify-start"} ${getAnimationClass()}`}>
      <div
        className={`max-w-[85%] p-3 rounded-lg ${getMessageStyleClasses()} transition-all duration-300`}
        style={{
          maxWidth: isInformationalMessage ? "95%" : "85%",
          opacity: isInformationalMessage ? 0.95 : 1,
        }}
      >
        {isInformationalMessage || isModelResponse ? (
          // For system/information messages, add icon
          <div className="flex items-start">
            {getMessageIcon()}
            <p className={getFontSizeClass()}>{message.content}</p>
          </div>
        ) : (
          // For regular messages, use markdown processing
          <div
            className={`prose dark:prose-invert max-w-none chat-message ${getFontSizeClass()}`}
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        )}
        <div className={`text-xs text-right mt-1 select-none ${isInformationalMessage ? "opacity-50" : "opacity-70"}`}>
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
