"use client"

import * as React from 'react';
import { useRef, useEffect, useMemo, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { Message } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';

interface ChatMessageListProps {
  messages: Message[];
}

export function ChatMessageList({ messages }: ChatMessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  
  const carouselItems = [
    {
      title: "Analyze Your Codebase",
      description: "Uncover hidden bottlenecks, quantify technical debt, and unlock faster, safer deployments."
    },
    {
      title: "Enterprise Intelligence Hub",
      description: "Swift transforms your technology assets into strategic business advantages. Make faster executive decisions with AI-powered insights."
    },
    {
      title: "Accelerate Development",
      description: "Identify technical vulnerabilities and optimize your engineering resources for maximum efficiency."
    }
  ];
  
  // Auto-rotate carousel every 4 seconds
  useEffect(() => {
    if (messages.length === 0) {
      const interval = setInterval(() => {
        setActiveIndex((current) => (current === carouselItems.length - 1 ? 0 : current + 1));
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [messages.length, carouselItems.length]);
  
  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollContainerRef.current && messages.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      // Use requestAnimationFrame to ensure DOM has updated before scrolling
      requestAnimationFrame(() => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      });
    }
  }, [messages]);

  // Memoize the empty state to prevent unnecessary re-renders
  const EmptyState = useMemo(() => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md mx-auto">
        {/* Carousel */}
        <div className="mb-8 relative">
          {carouselItems.map((item, index) => (
            <div
              key={index}
              className={`transition-opacity duration-500 ${
                index === activeIndex ? 'opacity-100' : 'opacity-0 absolute top-0 left-0 right-0'
              }`}
            >
              <h2 className="text-2xl font-bold mb-2">{item.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {item.description}
              </p>
              
              {index === activeIndex && (
                <div className="mb-6">
                  <a 
                    href="https://calendly.com/karoriwal/swift" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-md font-medium 
                            hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    Book a Demo
                  </a>
                </div>
              )}
            </div>
          ))}
          
          {/* Carousel indicators */}
          <div className="flex justify-center mt-4 space-x-2">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  index === activeIndex ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
        
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
  ), [activeIndex, carouselItems]);

  return (
    <div className="flex-1 p-4 overflow-hidden h-full w-full">
      {messages.length === 0 ? (
        EmptyState
      ) : (
        <div 
          ref={scrollContainerRef}
          className={`max-w-4xl mx-auto h-full overflow-y-auto scrollbar-${resolvedTheme}`}
          style={{ overflowX: 'hidden' }}
        >
          {messages.map((message, index) => (
            <div key={index} className="py-2">
              <ChatMessage message={message} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
