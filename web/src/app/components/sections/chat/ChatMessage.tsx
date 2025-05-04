"use client";

import { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Message } from '../../../context/chat/types';
import { useTheme } from '../../../context/ThemeContext';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme();
  const [processedContent, setProcessedContent] = useState<string>(message.content);
  const isSystemMessage =
    message.role === 'assistant' &&
    (message.content.includes('successfully ingested and is ready to query') ||
      message.content.includes('Please select a model') ||
      message.content.includes('wait for the repository to be downloaded'));

  // Parse markdown content for code blocks and links
  useEffect(() => {
    try {
      // Create a custom renderer for code blocks
      const customRenderer = {
        code(code: string, language?: string): string {
          // Use language for syntax highlighting if provided
          const validLanguage = language && (
            language === 'js' || language === 'javascript' ||
            language === 'ts' || language === 'typescript' ||
            language === 'jsx' || language === 'tsx' ||
            language === 'html' || language === 'css' ||
            language === 'json' || language === 'python' ||
            language === 'bash' || language === 'sh' ||
            language === 'java' || language === 'go' ||
            language === 'c' || language === 'cpp' ||
            language === 'csharp' || language === 'ruby'
          );

          if (validLanguage) {
            return `<pre><code class="language-${language}">${code}</code></pre>`;
          }

          // Fall back to default rendering if not using custom highlighting
          return `<pre><code>${code}</code></pre>`;
        }
      };

      // Configure marked options
      const options = {
        breaks: true,
        gfm: true,
        headerIds: false,
        renderer: customRenderer
      };

      // Parse the markdown content
      const rawHtml = marked(message.content, options);

      // Sanitize HTML to prevent XSS attacks
      const sanitizedHtml = DOMPurify(window).sanitize(rawHtml, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel']
      });

      setProcessedContent(sanitizedHtml);
    } catch (error) {
      console.error('Error processing markdown:', error);
      setProcessedContent(message.content);
    }
  }, [message.content]);

  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] p-3 rounded-lg 
          ${message.role === 'user'
            ? 'bg-black text-white dark:bg-white dark:text-black'
            : isSystemMessage
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
              : 'bg-gray-200 dark:bg-gray-800 text-black dark:text-white'
          }`}
      >
        {message.role === 'assistant' && isSystemMessage ? (
          // For system messages, don't use markdown processing
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-sm">{message.content}</p>
          </div>
        ) : (
          // For regular messages, use markdown processing
          <div
            className="prose dark:prose-invert max-w-none chat-message"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        )}
        <div className="text-xs text-right mt-1 opacity-70 select-none">
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        </div>
      </div>
    </div>
  );
}
