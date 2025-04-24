"use client"

import { useRef, useEffect, useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { ChatMessage } from './ChatMessage';
import { Message } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';

interface ChatMessageListProps {
  messages: Message[];
}

const ITEM_HEIGHT = 150; // Approximate height for each message item

// Row renderer for virtualized list
const MessageRow = ({ index, style, data }: { index: number; style: React.CSSProperties; data: Message[] }) => {
  const message = data[index];
  return (
    <div style={style}>
      <div style={{ padding: '10px 0' }}>
        <ChatMessage message={message} />
      </div>
    </div>
  );
};

export function ChatMessageList({ messages }: ChatMessageListProps) {
  // Using a generic React ref without specific typing
  const listRef = useRef(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600); // Default height
  const [containerWidth, setContainerWidth] = useState(800); // Default width
  const { resolvedTheme } = useTheme();

  // Create a ResizeObserver to update container dimensions
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setContainerHeight(entries[0].contentRect.height);
        setContainerWidth(entries[0].contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      // Type assertion to access the scrollToItem method
      (listRef.current as { scrollToItem: (index: number, align: string) => void })
        .scrollToItem(messages.length - 1, "end");
    }
  }, [messages]);

  // Memoize the empty state to prevent unnecessary re-renders
  const EmptyState = useMemo(() => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-2">Enterprise Intelligence Hub</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Swift transforms your technology assets into strategic business advantages. Make faster executive decisions with AI-powered insights.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Strategic Planning</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Align technology initiatives with core business objectives
            </p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Risk Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Identify technical vulnerabilities and compliance concerns
            </p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Digital Transformation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Accelerate innovation and modernization initiatives
            </p>
          </div>
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 className="font-medium mb-1">Resource Optimization</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Maximize ROI on technology investments and talent
            </p>
          </div>
        </div>
      </div>
    </div>
  ), []);

  return (
    <div 
      ref={containerRef} 
      className="flex-1 p-4 overflow-hidden"
      style={{ height: "100%", width: "100%" }}
    >
      {messages.length === 0 ? (
        EmptyState
      ) : (
        <div className="max-w-4xl mx-auto h-full">
          {/* @ts-expect-error FixedSizeList has incompatible type definitions with React refs */}
          <List
            ref={listRef}
            height={containerHeight}
            width={containerWidth}
            itemCount={messages.length}
            itemSize={ITEM_HEIGHT}
            itemData={messages}
            overscanCount={5} // Overscan to pre-render items outside viewport
            className={`scrollbar-${resolvedTheme}`}
            style={{ overflowX: 'hidden', willChange: 'transform' }}
          >
            {MessageRow}
          </List>
        </div>
      )}
    </div>
  );
}
