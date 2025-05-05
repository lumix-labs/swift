"use client";

import React from "react";
import { Modal } from "../shared/Modal";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Privacy Policy" size="xl">
      <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Swift Privacy Policy</h2>
        <p className="mb-4">Last Updated: May 5, 2025</p>

        <h3 className="text-lg font-medium mb-2">1. Introduction</h3>
        <p className="mb-4">
          This Privacy Policy explains how Swift (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses,
          and protects information when you use our AI-powered code assistant service. We are committed to ensuring the
          privacy and security of your data.
        </p>

        <h3 className="text-lg font-medium mb-2">2. Information We Collect</h3>
        <p className="mb-4">We collect the following types of information:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>GitHub Repository Data:</strong> When you connect your GitHub repositories, we analyze the code
            within those repositories to provide AI-assisted insights.
          </li>
          <li>
            <strong>Chat Conversations:</strong> We store your conversations with our AI assistant to provide you with
            continuity in the chat session.
          </li>
          <li>
            <strong>User Preferences:</strong> We store your selected LLM models and repository connections to
            personalize your experience.
          </li>
        </ul>

        <h3 className="text-lg font-medium mb-2">3. How We Use Your Information</h3>
        <p className="mb-4">We use your information to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Provide, maintain, and improve our Service</li>
          <li>Enable the AI to analyze your code repositories and answer your questions</li>
          <li>Customize your experience based on your preferences</li>
        </ul>

        <h3 className="text-lg font-medium mb-2">4. Storage and Security</h3>
        <p className="mb-4">In the current MVP implementation:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>Local Storage Only:</strong> All data is stored on your device using localStorage. We do not store
            your repository data or chat history on our servers.
          </li>
          <li>
            <strong>Temporary Processing:</strong> When you interact with the AI assistant, your queries and repository
            data are sent to the selected LLM provider (e.g., Gemini) for processing and are not retained by us beyond
            what is necessary to provide you with a response.
          </li>
        </ul>

        <h3 className="text-lg font-medium mb-2">5. Third-Party Services</h3>
        <p className="mb-4">Our Service integrates with the following third-party services:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>
            <strong>GitHub:</strong> To access your repositories.
          </li>
          <li>
            <strong>LLM Providers:</strong> Currently Gemini, with potential future integration with Anthropic.
          </li>
        </ul>
        <p className="mb-4">
          Each of these services has its own privacy policy governing how they use and protect your data. We recommend
          reviewing their privacy policies.
        </p>

        <h3 className="text-lg font-medium mb-2">6. Data Retention</h3>
        <p className="mb-4">
          As this is a client-side application using localStorage, your data remains in your browser&apos;s storage
          until you clear your browser data or manually delete it through the application interface.
        </p>

        <h3 className="text-lg font-medium mb-2">7. Your Rights</h3>
        <p className="mb-4">You have the right to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Access, update, or delete your information</li>
          <li>Disconnect your GitHub repositories from our Service</li>
          <li>Clear your chat history and stored preferences</li>
        </ul>

        <h3 className="text-lg font-medium mb-2">8. Children&apos;s Privacy</h3>
        <p className="mb-4">
          Our Service is not directed to children under the age of 13, and we do not knowingly collect information from
          children under 13.
        </p>

        <h3 className="text-lg font-medium mb-2">9. Changes to This Privacy Policy</h3>
        <p className="mb-4">
          We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new
          Privacy Policy on this page and updating the &quot;Last Updated&quot; date.
        </p>

        <h3 className="text-lg font-medium mb-2">10. Contact Us</h3>
        <p className="mb-4">
          If you have any questions about this Privacy Policy, please contact us at privacy@swiftai.com.
        </p>
      </div>
    </Modal>
  );
}
