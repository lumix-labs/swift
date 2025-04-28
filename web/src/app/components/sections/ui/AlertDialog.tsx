"use client";
import React, { useEffect, useRef } from "react";
import { Toast } from "./Toast";


export interface AlertDialogProps {
  show: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  onClose: () => void;
  // New optional props
  actions?: Array<{
    label: string;
    onClick: () => void;
    primary?: boolean;
  }>;
}

export function AlertDialog({ 
  show, 
  title, 
  message, 
  type, 
  onClose,
  actions 
}: AlertDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Removed unused isMobile variable for lint fix
  
  // Check if this is an "OK-only" alert (no custom actions or single OK button)
  const isOkOnlyAlert = !actions || (actions.length === 1 && actions[0].label.toLowerCase() === "ok");
  
  // Always use Toast for "OK-only" alerts (not just on mobile)
  const shouldUseToast = isOkOnlyAlert;

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (show && dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, onClose]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (show && event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [show, onClose]);

  // If using Toast, just render it and return
  if (shouldUseToast) {
    return (
      <Toast
        show={show}
        title={title}
        message={message}
        type={type}
        onClose={onClose}
        duration={3000}
      />
    );
  }

  if (!show) return null;

  // Determine background color based on type
  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-gray-50 dark:bg-gray-900/20";
      case "error":
        return "bg-gray-50 dark:bg-gray-900/20";
      case "warning":
        return "bg-gray-50 dark:bg-gray-900/20";
      case "info":
      default:
        return "bg-gray-50 dark:bg-gray-900/20";
    }
  };

  // Determine icon and accent color based on type
  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          color: "text-green-600 dark:text-green-400",
          buttonColor: "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white"
        };
      case "error":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          color: "text-red-600 dark:text-red-400",
          buttonColor: "bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white"
        };
      case "warning":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          color: "text-yellow-600 dark:text-yellow-400",
          buttonColor: "bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-500 dark:hover:bg-yellow-600 text-white"
        };
      case "info":
      default:
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "text-blue-600 dark:text-blue-400",
          buttonColor: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white"
        };
    }
  };

  const { icon, color, buttonColor } = getIconAndColor();
  const bgColor = getBgColor();

  // If no custom actions are provided, use the default "OK" button
  const dialogActions = actions || [
    {
      label: "OK",
      onClick: onClose,
      primary: true
    }
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div
        ref={dialogRef}
        className={`relative max-w-md w-full rounded-lg shadow-2xl ${bgColor} p-6 overflow-hidden border border-gray-100 dark:border-gray-700`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <h3 className={`text-lg font-medium ${color}`}>{title}</h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{message}</p>
            <div className="mt-4 flex space-x-3 justify-end">
              {dialogActions.map((action, index) => (
                <button
                  key={index}
                  type="button"
                  className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium shadow-md hover:shadow-lg transition-all ${
                    action.primary
                      ? buttonColor
                      : "text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                  } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
