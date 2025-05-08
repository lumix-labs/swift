"use client";

import { clearStorageAndRefreshState } from "./storage";

/**
 * Types of storage errors that can occur
 */
export enum StorageErrorType {
  CORRUPTED_DATA = "corrupted_data",
  QUOTA_EXCEEDED = "quota_exceeded",
  PERMISSION_DENIED = "permission_denied",
  UNKNOWN = "unknown",
}

/**
 * Interface for storage error details
 */
export interface StorageErrorDetails {
  type: StorageErrorType;
  message: string;
  originalError?: unknown;
}

/**
 * Determine the type of storage error
 * @param error The original error object
 * @returns StorageErrorDetails with categorized error type
 */
export function categorizeStorageError(error: unknown): StorageErrorDetails {
  const errorMsg = error instanceof Error ? error.message : String(error);

  // Check for specific error patterns
  if (errorMsg.includes("quota") || errorMsg.includes("exceeded") || errorMsg.includes("full")) {
    return {
      type: StorageErrorType.QUOTA_EXCEEDED,
      message: "Browser storage quota exceeded",
      originalError: error,
    };
  }

  if (errorMsg.includes("permission") || errorMsg.includes("denied") || errorMsg.includes("not allowed")) {
    return {
      type: StorageErrorType.PERMISSION_DENIED,
      message: "Permission denied for local storage access",
      originalError: error,
    };
  }

  if (
    errorMsg.includes("parse") ||
    errorMsg.includes("JSON") ||
    errorMsg.includes("format") ||
    errorMsg.includes("invalid") ||
    errorMsg.includes("corrupt")
  ) {
    return {
      type: StorageErrorType.CORRUPTED_DATA,
      message: "Data in local storage appears to be corrupted",
      originalError: error,
    };
  }

  return {
    type: StorageErrorType.UNKNOWN,
    message: `Unspecified storage error: ${errorMsg}`,
    originalError: error,
  };
}

/**
 * Handle a storage error by logging it and taking appropriate recovery action
 * @param error The storage error that occurred
 * @param key Optional storage key related to the error
 * @param autoRecover Whether to automatically recover (clear storage and refresh)
 * @returns False if error occurred, true if recovery was successful
 */
export function handleStorageError(error: unknown, key?: string, autoRecover: boolean = true): boolean {
  const errorDetails = categorizeStorageError(error);

  // Log with appropriate level and details
  console.error(`Storage error${key ? ` (key: ${key})` : ""}: ${errorDetails.message}`, errorDetails.originalError);

  // Automatically recover for most error types
  if (autoRecover) {
    console.info(`Attempting recovery for ${errorDetails.type} error`);
    return clearStorageAndRefreshState(true);
  }

  return false;
}

/**
 * Wrapper for safely accessing localStorage that handles errors properly
 * @param operation Function that attempts to use localStorage
 * @param fallbackValue Value to return if operation fails
 * @returns The result of the operation or fallback value if error occurred
 */
export function safeStorageOperation<T>(operation: () => T, fallbackValue: T): T {
  try {
    return operation();
  } catch (error) {
    handleStorageError(error);
    return fallbackValue;
  }
}

/**
 * Test if localStorage is available and working
 * @returns True if localStorage is available and working
 */
export function isLocalStorageAvailable(): boolean {
  return safeStorageOperation(() => {
    const testKey = "_test_" + Math.random().toString(36).substring(2);
    localStorage.setItem(testKey, "test");
    const result = localStorage.getItem(testKey) === "test";
    localStorage.removeItem(testKey);
    return result;
  }, false);
}
