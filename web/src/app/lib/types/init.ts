"use client";

// Safe initialization utility for message types
import { SenderType } from "./message";

export function initializeMessageTypes() {
  try {
    // Ensure SenderType enum is properly loaded
    if (!SenderType || typeof SenderType !== "object") {
      throw new Error("SenderType enum not properly loaded");
    }

    // Validate all required enum values exist
    const requiredTypes = ["USER", "SWIFT_ASSISTANT", "AI_ADVISOR"];
    for (const type of requiredTypes) {
      if (!(type in SenderType)) {
        throw new Error(`SenderType.${type} is missing`);
      }
    }

    console.log("Message types initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize message types:", error);
    return false;
  }
}

// Call initialization immediately
initializeMessageTypes();
