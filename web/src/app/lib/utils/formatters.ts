"use client";

/**
 * Utility functions for formatting
 */

/**
 * Truncate a string to a specified length and add ellipsis if needed
 * @param str The string to truncate
 * @param maxLength Maximum length of the string
 * @param suffix Suffix to add if truncated (default: "...")
 * @returns Truncated string
 */
export function truncateString(str: string, maxLength: number, suffix: string = "..."): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + suffix;
}

/**
 * Format a date to a readable string
 * @param date Date to format
 * @param options Options for formatting (default: medium date and time)
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
  },
): string {
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

/**
 * Format a message content for display
 * - Replaces newlines with HTML line breaks
 * - Truncates if longer than maxLength
 * @param content Message content
 * @param maxLength Maximum length (default: no limit)
 * @returns Formatted content
 */
export function formatMessageContent(content: string, maxLength?: number): string {
  if (maxLength && content.length > maxLength) {
    content = truncateString(content, maxLength);
  }

  // For non-markdown content, preserve line breaks
  return content.replace(/\n/g, "<br />");
}
