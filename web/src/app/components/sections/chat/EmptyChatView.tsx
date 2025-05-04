"use client";

import React from 'react';
import { HeroSection } from '../hero/HeroSection';
import { SuggestedPrompts } from './SuggestedPrompts';

interface EmptyChatViewProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyChatView({ onSelectPrompt }: EmptyChatViewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1">
        <HeroSection />
      </div>
      <div className="mt-auto">
        <SuggestedPrompts onSelectPrompt={onSelectPrompt} />
      </div>
    </div>
  );
}
