"use client";

import { useEffect, useState } from "react";
import { isLocalStorageAvailable } from "../../lib/utils/errorHandling";
import { clearStorageAndRefreshState } from "../../lib/utils/storage";

/**
 * Component that checks localStorage on app startup
 * and handles any detected issues
 */
export function StorageChecker() {
  const [storageCheckComplete, setStorageCheckComplete] = useState(false);
  const [hasStorageError, setHasStorageError] = useState(false);

  useEffect(() => {
    // Check if localStorage is available and working
    const storageAvailable = isLocalStorageAvailable();

    if (!storageAvailable) {
      setHasStorageError(true);
    }

    setStorageCheckComplete(true);
  }, []);

  // Handle storage error if detected
  useEffect(() => {
    if (storageCheckComplete && hasStorageError) {
      console.error("LocalStorage is not available or corrupted");
      clearStorageAndRefreshState(true);
    }
  }, [storageCheckComplete, hasStorageError]);

  // This component doesn't render anything
  return null;
}

export default StorageChecker;
