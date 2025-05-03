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
    return 'Just now';
  }

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const timeString = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  if (isToday) {
    return `Today at ${timeString}`;
  }

  return `${date.toLocaleDateString()} at ${timeString}`;
};

/**
 * Detects if the code is running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Gets the system theme preference (light or dark)
 * @returns 'dark' if the system prefers dark mode, 'light' otherwise
 */
export const getSystemTheme = (): 'light' | 'dark' => {
  if (!isBrowser) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
