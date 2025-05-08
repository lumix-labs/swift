"use client";

/**
 * Centralized localStorage utilities
 * Generic functions for handling localStorage operations with error handling
 */

/**
 * Save data to localStorage with error handling
 * @param key Storage key
 * @param value Value to store (will be JSON stringified)
 * @returns True if successful, false if error occurred
 */
export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage (key: ${key}):`, error);
    return false;
  }
}

/**
 * Load data from localStorage with error handling
 * @param key Storage key
 * @param defaultValue Default value if key doesn't exist or error occurs
 * @returns Parsed value or default value
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) {
      return defaultValue;
    }
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.error(`Error loading from localStorage (key: ${key}):`, error);
    return defaultValue;
  }
}

/**
 * Remove item from localStorage with error handling
 * @param key Storage key to remove
 * @returns True if successful, false if error occurred
 */
export function removeFromStorage(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing from localStorage (key: ${key}):`, error);
    return false;
  }
}
