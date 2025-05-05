"use client";

import React from "react";
import { Modal } from "../shared/Modal";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Terms of Service" size="xl">
      <div className="prose dark:prose-invert max-w-none prose-sm sm:prose-base overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Swift Terms of Service</h2>
        <p className="mb-4">Last Updated: May 5, 2025</p>

        <h3 className="text-lg font-medium mb-2">1. Acceptance of Terms</h3>
        <p className="mb-4">
          By accessing or using Swift (the &quot;Service&quot;), you agree to be bound by these Terms of Service. If you
          do not agree to these terms, please do not use the Service.
        </p>

        <h3 className="text-lg font-medium mb-2">2. Description of Service</h3>
        <p className="mb-4">
          Swift is an AI-powered code assistant that enables users to chat with large language models (LLMs) about their
          GitHub repositories. The Service allows users to connect their GitHub repositories for analysis and to
          interact with AI about the code in a conversational interface.
        </p>

        <h3 className="text-lg font-medium mb-2">3. User Accounts</h3>
        <p className="mb-4">
          To use certain features of the Service, you may need to create an account. You are responsible for maintaining
          the confidentiality of your account information and for all activities that occur under your account.
        </p>

        <h3 className="text-lg font-medium mb-2">4. GitHub Integration</h3>
        <p className="mb-4">
          The Service requires access to your GitHub repositories. By granting Swift access to your GitHub account, you
          represent that you have the authority to share these repositories with our Service. Swift will only access
          repositories you explicitly select for analysis.
        </p>

        <h3 className="text-lg font-medium mb-2">5. Intellectual Property</h3>
        <p className="mb-4">
          Swift respects the intellectual property rights of others. The Service does not claim ownership of your
          repositories or any code within them. We only process and analyze the data to provide you with insights and
          assistance.
        </p>

        <h3 className="text-lg font-medium mb-2">6. User Conduct</h3>
        <p className="mb-4">You agree not to use the Service to:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe upon the rights of others</li>
          <li>Submit or analyze code that contains malware, viruses, or other harmful components</li>
          <li>Attempt to gain unauthorized access to the Service or its related systems</li>
          <li>Engage in any activity that interferes with or disrupts the Service</li>
        </ul>

        <h3 className="text-lg font-medium mb-2">7. Data Storage</h3>
        <p className="mb-4">
          Swift currently uses client-side storage (localStorage) only. Your data remains on your device and is not
          transmitted to our servers except as necessary to process AI queries. This implementation may change in future
          versions of the Service, and users will be notified of any changes.
        </p>

        <h3 className="text-lg font-medium mb-2">8. Third-Party Services</h3>
        <p className="mb-4">
          The Service integrates with third-party services, including GitHub and AI models like Gemini. Your use of
          these third-party services is subject to their respective terms of service and privacy policies.
        </p>

        <h3 className="text-lg font-medium mb-2">9. Limitation of Liability</h3>
        <p className="mb-4">
          The Service is provided &quot;as is&quot; without warranties of any kind. We are not responsible for any
          damages arising from your use of the Service, including but not limited to any errors in code analysis or
          AI-generated suggestions.
        </p>

        <h3 className="text-lg font-medium mb-2">10. Modification of Terms</h3>
        <p className="mb-4">
          We reserve the right to modify these Terms at any time. Continued use of the Service after any modifications
          constitutes your acceptance of the revised Terms.
        </p>

        <h3 className="text-lg font-medium mb-2">11. Termination</h3>
        <p className="mb-4">
          We reserve the right to terminate or suspend your access to the Service at any time, for any reason, without
          notice.
        </p>

        <h3 className="text-lg font-medium mb-2">12. Contact Information</h3>
        <p className="mb-4">If you have any questions about these Terms, please contact us at support@swiftai.com.</p>
      </div>
    </Modal>
  );
}
