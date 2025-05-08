"use client";

/**
 * Utility functions for the web module
 */

/**
 * Formats a timestamp into a human-readable string
 * @param timestamp The timestamp to format (number or Date object)
 * @returns A formatted string (e.g., "Today at 14:30")
 */
export const formatTimestamp = (timestamp?: number | Date): string => {
  if (!timestamp) {
    return "Just now";
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeString = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return `Today at ${timeString}`;
  }

  return `${date.toLocaleDateString()} at ${timeString}`;
};

/**
 * Detects if the code is running in a browser environment
 */
export const isBrowser = typeof window !== "undefined";

/**
 * Gets the system theme preference (light or dark)
 * @returns 'dark' if the system prefers dark mode, 'light' otherwise
 */
export const getSystemTheme = (): "light" | "dark" => {
  if (!isBrowser) {
    return "light";
  }

  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
};

/**
 * Safely parses JSON with a fallback value
 * @param jsonString The JSON string to parse
 * @param fallback The fallback value if parsing fails
 * @returns The parsed JSON or fallback value
 */
export function safeJsonParse<T>(jsonString: string | null, fallback: T): T {
  if (!jsonString) {
    return fallback;
  }

  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return fallback;
  }
}

/**
 * Safely stringifies JSON with error handling
 * @param value The value to stringify
 * @returns The stringified JSON or an empty string on error
 */
export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error("Error stringifying JSON:", error);
    return "";
  }
}

/**
 * Creates a debounced version of a function
 * @param func The function to debounce
 * @param wait The wait time in milliseconds
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  // Use an arrow function to avoid 'this' context issues
  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
}

/**
 * Creates a throttled version of a function
 * @param func The function to throttle
 * @param limit The time limit in milliseconds
 * @returns A throttled version of the function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  // Use an arrow function to avoid 'this' context issues
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Formats a GitHub repository URL to a standardized format
 * @param url The GitHub repository URL
 * @returns A standardized repository URL
 */
export function formatGithubUrl(url: string): string {
  try {
    // Remove trailing slash if present
    url = url.replace(/\/$/, "");

    // Parse URL to extract username and repo name
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);

    if (!match) {
      return url;
    }

    const [, username, repoName] = match;

    // Return standardized format
    return `https://github.com/${username}/${repoName}`;
  } catch (error) {
    console.error("Error formatting GitHub URL:", error);
    return url;
  }
}

/**
 * Extract repository name from GitHub URL
 * @param url The GitHub repository URL
 * @returns The repository name or a default value
 */
export function extractRepoName(url: string): string {
  try {
    const match = url.match(/github\.com\/[^/]+\/([^/]+)/i);
    return match ? match[1] : "Repository";
  } catch (error) {
    console.error("Error extracting repo name:", error);
    return "Repository";
  }
}

/**
 * Logs performance data for debugging
 * @param label The label for the performance log
 * @param callback The callback function to measure
 * @returns The result of the callback
 */
export function measurePerformance<T>(label: string, callback: () => T): T {
  const start = performance.now();
  const result = callback();
  const end = performance.now();
  console.warn(`Performance [${label}]: ${(end - start).toFixed(2)}ms`);
  return result;
}

/**
 * Creates a profiler that can be used to measure function performance
 * @param name The name of the profiler
 * @returns An object with start and end methods
 */
export function createProfiler(name: string) {
  const start = performance.now();
  let lastMark = start;

  return {
    mark: (label: string) => {
      const now = performance.now();
      console.warn(`${name} - ${label}: ${(now - lastMark).toFixed(2)}ms`);
      lastMark = now;
    },
    end: () => {
      const end = performance.now();
      console.warn(`${name} - Total: ${(end - start).toFixed(2)}ms`);
    },
  };
}
