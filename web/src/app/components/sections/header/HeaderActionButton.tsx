"use client";

import React from "react";

interface HeaderActionButtonProps {
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => void;
  label: React.ReactNode;
  icon: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  target?: string;
  rel?: string;
}

export function HeaderActionButton({
  href = "#",
  onClick,
  label,
  icon,
  ariaLabel,
  className = "",
  target,
  rel,
}: HeaderActionButtonProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      aria-label={typeof ariaLabel === 'string' ? ariaLabel : (typeof label === 'string' ? label : '')}
      target={target}
      rel={rel}
    >
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{icon}</span>
    </a>
  );
}
