/**
 * Utility functions for handling debug mode
 */

/**
 * Toggle debug mode and dispatch a custom event that GeminiService listens for
 * @param enabled Boolean indicating whether debug mode should be enabled
 */
export function toggleDebugMode(enabled: boolean): void {
  if (typeof window !== "undefined") {
    try {
      // Store in localStorage for persistence
      localStorage.setItem("swift_debug_mode", enabled ? "true" : "false");

      // Dispatch custom event for GeminiService to listen for
      const event = new CustomEvent("swift_debug_toggle", {
        detail: { enabled },
      });
      window.dispatchEvent(event);

      console.log(`Debug mode ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error toggling debug mode:", error);
    }
  }
}

/**
 * Get current debug mode state from localStorage
 * @returns Boolean indicating whether debug mode is enabled
 */
export function getDebugModeState(): boolean {
  if (typeof window !== "undefined") {
    try {
      const state = localStorage.getItem("swift_debug_mode");
      return state === "true";
    } catch (error) {
      console.error("Error getting debug mode state:", error);
    }
  }
  return false; // Default to false if localStorage is not available
}
