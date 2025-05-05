"use client";

import React, { useState } from "react";
import { TermsModal } from "./TermsModal";
import { PrivacyModal } from "./PrivacyModal";

export function LegalModals() {
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const openTerms = () => {
    setIsTermsOpen(true);
  };

  const closeTerms = () => {
    setIsTermsOpen(false);
  };

  const openPrivacy = () => {
    setIsPrivacyOpen(true);
  };

  const closePrivacy = () => {
    setIsPrivacyOpen(false);
  };

  return (
    <>
      <TermsModal isOpen={isTermsOpen} onClose={closeTerms} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={closePrivacy} />
    </>
  );
}

// Export functions to open the modals
export const legalFunctions = {
  openTerms: null as null | (() => void),
  openPrivacy: null as null | (() => void),
};

// Create a component that registers the functions
export function LegalFunctionsRegistrar() {
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Register the functions
  React.useEffect(() => {
    legalFunctions.openTerms = () => setIsTermsOpen(true);
    legalFunctions.openPrivacy = () => setIsPrivacyOpen(true);

    return () => {
      legalFunctions.openTerms = null;
      legalFunctions.openPrivacy = null;
    };
  }, []);

  return (
    <>
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </>
  );
}
