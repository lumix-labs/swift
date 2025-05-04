"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useDropdown() {
  const [show, setShow] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(prev => !prev);
  }, []);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (show && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setShow(false);
    }
  }, [show]);

  // Set up click outside listener
  useEffect(() => {
    if (show) {
      document.addEventListener('click', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [show, handleClickOutside]);

  return {
    show,
    setShow,
    dropdownRef,
    toggleDropdown
  };
}
