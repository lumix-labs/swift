"use client";

/**
 * Generate a unique ID using timestamp and random number
 * Moved from useSessionManagement.ts into a pure utility function
 */
export function generateId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
