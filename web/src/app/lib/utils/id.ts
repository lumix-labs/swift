"use client";

/**
 * Generate a unique ID using timestamp and random number
 * Centralized utility function for ID generation across the application
 */
export function generateId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
