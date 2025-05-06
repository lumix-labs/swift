"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import Image from "next/image";
import { Message, MessageArtifact, SenderType, THINKING_STATES } from "../../../lib/types/message";
import { useTheme } from "../../../context/ThemeContext";
import { formatModelResponse } from "../../../lib/utils/formatModelResponse";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const { theme } = useTheme();
  const [processedContent, setProcessedContent] = useState<string>(message.content);
  const [thinkingText, setThinkingText] = useState<string>(THINKING_STATES[0]);

  // Determine message type for styling
  const isUserMessage = message.sender.type === SenderType.USER;
  const isInformationalMessage = message.sender.type === SenderType.SWIFT_ASSISTANT;
  const isAdvisorMessage = message.sender.type === SenderType.AI_ADVISOR;

  // For backward compatibility with old messages that might still have the old sender types
  const isLegacyModelMessage = message.role === "model-response" && !isAdvisorMessage;

  // Setup thinking animation
  useEffect(() => {
    if (!isLoading) {
      return;
    }

    let currentIndex = 0;
    const intervalId = setInterval(() => {
      currentIndex = (currentIndex + 1) % THINKING_STATES.length;
      setThinkingText(THINKING_STATES[currentIndex]);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [isLoading]);

  // Parse markdown content for code blocks and links
  useEffect(() => {
    try {
      // Always enable markdown rendering for AI advisor messages
      const shouldRenderMarkdown =
        message.isMarkdown || isAdvisorMessage || isLegacyModelMessage || message.sender.type === SenderType.AI_ADVISOR;

      if (!shouldRenderMarkdown) {
        setProcessedContent(message.content);
        return;
      }

      // Format model responses with Markdown
      const contentToProcess =
        isAdvisorMessage || isLegacyModelMessage ? formatModelResponse(message.content) : message.content;

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
              language === "ruby" ||
              language === "sql" ||
              language === "yaml" ||
              language === "markdown" ||
              language === "md");

          if (validLanguage) {
            return `<pre><code class="language-${language} hljs">${hljs.highlight(code, { language }).value}</code></pre>`;
          }

          // Fall back to default rendering if not using custom highlighting
          return `<pre><code class="hljs">${hljs.highlight(code, { language: "plaintext" }).value}</code></pre>`;
        },
        paragraph(text: string): string {
          return `<p class="mb-4">${text}</p>`;
        },
        heading(text: string, level: number): string {
          return `<h${level} class="font-bold text-lg mb-2">${text}</h${level}>`;
        },
        list(body: string, ordered: boolean): string {
          const tag = ordered ? "ol" : "ul";
          const className = ordered ? "list-decimal pl-5 mb-4" : "list-disc pl-5 mb-4";
          return `<${tag} class="${className}">${body}</${tag}>`;
        },
        listitem(text: string): string {
          return `<li class="mb-1">${text}</li>`;
        },
        blockquote(quote: string): string {
          return `<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-4">${quote}</blockquote>`;
        },
        table(header: string, body: string): string {
          return `<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 my-4">
            <thead>${header}</thead>
            <tbody>${body}</tbody>
          </table>`;
        },
        tablerow(content: string): string {
          return `<tr class="hover:bg-gray-50 dark:hover:bg-gray-800">${content}</tr>`;
        },
        tablecell(
          content: string,
          flags: {
            header: boolean;
            align: "center" | "left" | "right" | null;
          },
        ): string {
          const tag = flags.header ? "th" : "td";
          const alignment = flags.align ? `text-${flags.align}` : "";
          const classes = flags.header
            ? `px-6 py-3 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 ${alignment}`
            : `px-6 py-4 text-sm text-gray-500 dark:text-gray-400 ${alignment}`;
          return `<${tag} class="${classes}">${content}</${tag}>`;
        },
        codespan(text: string): string {
          return `<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">${text}</code>`;
        },
        strong(text: string): string {
          return `<strong class="font-bold">${text}</strong>`;
        },
        em(text: string): string {
          return `<em class="italic">${text}</em>`;
        },
        link(href: string, title: string | null, text: string): string {
          return `<a href="${href}" title="${title || ""}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">${text}</a>`;
        },
        image(href: string, title: string | null, text: string): string {
          return `<img src="${href}" alt="${text}" title="${title || ""}" class="max-w-full h-auto rounded" />`;
        },
      };

      // Configure highlight options
      const options = {
        highlight: function (code: string, lang: string) {
          const language = hljs.getLanguage(lang) ? lang : "plaintext";
          return hljs.highlight(code, { language }).value;
        },
        renderer: customRenderer,
        breaks: true,
        gfm: true,
        pedantic: false,
        headerIds: false,
      };

      // Parse the markdown content
      const rawHtml = marked(contentToProcess, options);

      // Sanitize HTML to prevent XSS attacks
      const sanitizedHtml = DOMPurify(window).sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel", "class"],
      });

      setProcessedContent(sanitizedHtml);
    } catch (error) {
      console.error("Error processing markdown:", error);
      setProcessedContent(message.content);
    }
  }, [message.content, isAdvisorMessage, isLegacyModelMessage, message.isMarkdown, message.role, message.sender.type]);

  // Render artifacts if present
  const renderArtifacts = (artifacts?: MessageArtifact[]) => {
    if (!artifacts || artifacts.length === 0) {
      return null;
    }

    return (
      <div className="mt-4 space-y-3">
        {artifacts.map((artifact) => {
          switch (artifact.type) {
            case "code":
              return (
                <div key={artifact.id} className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto">
                  <pre>
                    <code className="hljs">{artifact.content}</code>
                  </pre>
                </div>
              );
            case "image":
              return (
                <div key={artifact.id} className="rounded-md overflow-hidden">
                  <img src={artifact.content} alt="Message attachment" className="max-w-full h-auto" />
                </div>
              );
            case "pdf":
              return (
                <div key={artifact.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>PDF Document</span>
                  <a
                    href={artifact.content}
                    download
                    className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Download
                  </a>
                </div>
              );
            case "ppt":
              return (
                <div key={artifact.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-orange-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Presentation</span>
                  <a
                    href={artifact.content}
                    download
                    className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Download
                  </a>
                </div>
              );
            case "chart":
              return (
                <div key={artifact.id} className="bg-white dark:bg-gray-800 p-4 rounded-md shadow-sm">
                  <div dangerouslySetInnerHTML={{ __html: artifact.content }} />
                </div>
              );
            default:
              return (
                <div key={artifact.id} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md">
                  {artifact.content}
                </div>
              );
          }
        })}
      </div>
    );
  };

  // Get styling based on message type
  const getMessageStyleClasses = () => {
    if (isUserMessage) {
      return "bg-white text-black dark:bg-gray-900 dark:text-white shadow-md";
    } else if (isInformationalMessage) {
      return "bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 text-sm";
    } else if (isAdvisorMessage || isLegacyModelMessage) {
      // Improved model response styling for better contrast
      return "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 shadow-sm border border-gray-200 dark:border-gray-700";
    } else {
      return "bg-gray-100 dark:bg-gray-800 text-black dark:text-white shadow-sm";
    }
  };

  // Get font size based on message type
  const getFontSizeClass = () => {
    if (isInformationalMessage) {
      return "text-sm";
    } else if (isUserMessage || isAdvisorMessage || isLegacyModelMessage) {
      return "text-base";
    }
    return "text-base";
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

  // Render thinking animation if loading
  if (isLoading && (isAdvisorMessage || isLegacyModelMessage)) {
    return (
      <div className="flex justify-start">
        <div className={`max-w-[85%] p-3 rounded-lg ${getMessageStyleClasses()} transition-all animate-pulse`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              <Image
                src={message.sender.avatarUrl}
                alt={message.sender.name}
                width={32}
                height={32}
                className="rounded-full"
              />
            </div>
            <div className="flex flex-col w-full">
              <div className="flex items-center">
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{message.sender.name}</span>
                {message.sender.personalityType && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({message.sender.personalityType})
                  </span>
                )}
              </div>
              <div className="mt-1.5 flex items-center space-x-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce delay-100"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-bounce delay-200"></div>
                <span className="text-sm italic text-gray-500 dark:text-gray-400 ml-2">{thinkingText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUserMessage ? "justify-end" : "justify-start"} ${getAnimationClass()}`}>
      <div
        className={`max-w-[85%] p-3 rounded-lg ${getMessageStyleClasses()} transition-all duration-300`}
        style={{
          maxWidth: isInformationalMessage ? "95%" : "85%",
          opacity: isInformationalMessage ? 0.95 : 1,
        }}
      >
        {!isUserMessage && (
          <div className="flex items-center mb-2">
            <Image
              src={message.sender.avatarUrl}
              alt={message.sender.name}
              width={24}
              height={24}
              className="rounded-full mr-2"
            />
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{message.sender.name}</span>
            {message.sender.personalityType && (
              <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({message.sender.personalityType})</span>
            )}
          </div>
        )}

        {isInformationalMessage ? (
          // For information messages
          <div className="flex items-start">
            <p className={getFontSizeClass()}>{message.content}</p>
          </div>
        ) : (
          // For regular and model messages with markdown
          <div
            className={`prose dark:prose-invert max-w-none chat-message markdown-content ${getFontSizeClass()}`}
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        )}

        {/* Render artifacts if present */}
        {renderArtifacts(message.artifacts)}

        <div className={`text-xs text-right mt-2 select-none ${isInformationalMessage ? "opacity-50" : "opacity-70"}`}>
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}
