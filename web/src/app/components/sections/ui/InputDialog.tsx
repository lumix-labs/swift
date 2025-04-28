"use client";
import React, { useEffect, useRef, useState } from "react";

export interface InputDialogProps {
  show: boolean;
  title: string;
  label: string;
  placeholder?: string;
  initialValue?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  validationFn?: (value: string) => string | null;
}

export function InputDialog({
  show,
  title,
  label,
  placeholder = "",
  initialValue = "",
  onSubmit,
  onCancel,
  validationFn
}: InputDialogProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset form when dialog is opened
  useEffect(() => {
    if (show) {
      setValue(initialValue);
      setError(null);
      
      // Focus input after dialog is shown
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [show, initialValue]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, onCancel]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    if (show) {
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [show, onCancel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input if validation function is provided
    if (validationFn) {
      const validationError = validationFn(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    onSubmit(value);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4">
      <div
        ref={dialogRef}
        className="relative max-w-md w-full rounded-lg shadow-2xl bg-white dark:bg-gray-800 p-6 overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        <form onSubmit={handleSubmit} className="mt-4">
          <div>
            <label htmlFor="input-field" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </label>
            <div className="mt-1">
              <input
                ref={inputRef}
                type="text"
                id="input-field"
                className={`block w-full rounded-md border ${
                  error ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                } shadow-md px-4 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:shadow-lg transition-shadow`}
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
              />
              {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
          </div>
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex justify-center w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-md px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              onClick={onCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center w-full rounded-md border border-transparent shadow-md px-4 py-2 bg-black dark:bg-white text-sm font-medium text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
