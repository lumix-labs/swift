"use client";
import React, { useEffect, useState } from "react";

export interface ToastProps {
  show: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  onClose: () => void;
  duration?: number; // Duration in ms
}

export function Toast({ 
  show, 
  title, 
  message, 
  type, 
  onClose, 
  duration = 3000 
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Handle visibility state
  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for the fade-out animation before calling onClose
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  if (!show && !isVisible) return null;

  // Determine icon and accent color based on type
  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          color: "text-green-600 dark:text-green-400"
        };
      case "error":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          color: "text-red-600 dark:text-red-400"
        };
      case "warning":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          color: "text-yellow-600 dark:text-yellow-400"
        };
      case "info":
      default:
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "text-blue-600 dark:text-blue-400"
        };
    }
  };

  const { icon, color } = getIconAndColor();
  
  return (
    <div 
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-xs w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="flex p-4">
          <div className="flex-shrink-0 flex items-center justify-center">{icon}</div>
          <div className="ml-3 flex-1">
            {title && <p className={`text-sm font-medium ${color}`}>{title}</p>}
            {message && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
