"use client";

import {
  Message,
  Sender,
  SenderType,
  SENDERS,
  ROLE_TO_SENDER_TYPE,
  SENDER_TYPE_TO_ROLE,
  MessageRole,
} from "../../../lib/types/message";
import { getModelById } from "../../../lib/services/entity-service";

// Helper to create an advisor sender object with safety checks
export function createAdvisorSender(advisor: any): Sender {
  // Safety check: Return default if advisor is undefined or null
  if (!advisor || typeof advisor !== "object") {
    console.warn("createAdvisorSender called with invalid advisor:", advisor);
    return SENDERS[SenderType.AI_ADVISOR];
  }

  // Ensure all required properties exist
  return {
    id: advisor.id || "default-advisor",
    type: SenderType.AI_ADVISOR,
    name: advisor.name || "AI Advisor",
    avatarUrl: advisor.avatarUrl || advisor.icon || "/avatars/assistant.png",
    includeInModelContext: true,
    advisorId: advisor.id || "default-advisor",
    personalityType: advisor.personalityType || advisor.personality,
  };
}

// Helper to determine the appropriate sender for a message with enhanced safety
export function determineSender(role: string | SenderType, aiAdvisorId?: string | null): Sender {
  try {
    if (typeof role === "string" && Object.values(SenderType).includes(role as SenderType)) {
      // If role is already a SenderType, use it directly
      return SENDERS[role as SenderType];
    }

    // If role is a legacy role type, map it to the appropriate sender
    if (typeof role === "string" && role in ROLE_TO_SENDER_TYPE) {
      const senderType = ROLE_TO_SENDER_TYPE[role];

      // Special case for model-response - use AI Advisor with customized info
      if (role === "model-response" && aiAdvisorId) {
        const advisor = getModelById(aiAdvisorId);
        if (advisor && typeof advisor === "object" && advisor.id) {
          return createAdvisorSender(advisor);
        }
      }

      // Ensure SENDERS exists and has the senderType
      if (SENDERS && SENDERS[senderType]) {
        return SENDERS[senderType];
      }
    }

    // Default to user if can't determine sender
    return SENDERS[SenderType.USER];
  } catch (error) {
    console.error("Error in determineSender:", error, "role:", role, "aiAdvisorId:", aiAdvisorId);
    // Return safe default
    return SENDERS[SenderType.USER];
  }
}
