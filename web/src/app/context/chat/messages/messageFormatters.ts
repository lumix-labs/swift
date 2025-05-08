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

// Helper to create an advisor sender object
export function createAdvisorSender(advisor: any): Sender {
  if (!advisor) return SENDERS[SenderType.AI_ADVISOR];

  return {
    id: advisor.id || "default-advisor",
    type: SenderType.AI_ADVISOR,
    name: advisor.name || "AI Advisor",
    avatarUrl: advisor.avatarUrl || "/avatars/assistant.png",
    includeInModelContext: true,
    advisorId: advisor.id,
    personalityType: advisor.personalityType,
  };
}

// Helper to determine the appropriate sender for a message
export function determineSender(role: string | SenderType, aiAdvisorId?: string | null): Sender {
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
      if (advisor) {
        return createAdvisorSender(advisor);
      }
    }

    return SENDERS[senderType];
  }

  // Default to user if can't determine sender
  return SENDERS[SenderType.USER];
}
