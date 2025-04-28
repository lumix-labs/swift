"use client";
import React, { useEffect, useRef } from "react";

export interface AlertDialogProps {
  show: boolean;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  onClose: () => void;
}

export function AlertDialog({ show, title, message, type, onClose }: AlertDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, onClose]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [show, onClose]);

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
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          color: "text-black dark:text-white",
          buttonColor: "bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black"
        };
      case "error":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          color: "text-black dark:text-white",
          buttonColor: "bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black"
        };
      case "warning":
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          color: "text-black dark:text-white",
          buttonColor: "bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black"
        };
      case "info":
      default:
        return {
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-black dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: "text-black dark:text-white",
          buttonColor: "bg-black hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-black"
        };
    }
  };

  const { icon, color, buttonColor } = getIconAndColor();
  const bgColor = getBgColor();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div
        ref={dialogRef}
        className={`relative max-w-md w-full rounded-lg shadow-lg ${bgColor} p-6 overflow-hidden`}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">{icon}</div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <h3 className={`text-lg font-medium ${color}`}>{title}</h3>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{message}</p>
            <div className="mt-4">
              <button
                type="button"
                className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm ${buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
                onClick={onClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
