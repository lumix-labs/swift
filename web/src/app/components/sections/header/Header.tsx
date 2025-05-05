"use client";

import React from "react";
import Link from "next/link";
import { ThemeToggle } from "../theme/ThemeToggle";
import { useChat } from "../../../context/ChatContext";
import { useTheme } from "../../../context/ThemeContext";
import { HeaderActionButton } from "./HeaderActionButton";
import { AIAdvisorsDropdown } from "./AIAdvisorsDropdown";
import { RepositoriesDropdown } from "./RepositoriesDropdown";

export function Header() {
  const { createNewSession } = useChat();
  const { resolvedTheme } = useTheme();

  const handleNewChat = () => {
    createNewSession();
  };

  // Common button style for consistent appearance across all buttons
  const buttonStyle = `p-2 sm:px-3 sm:py-1.5 text-sm font-medium rounded-md transition-colors ${
    resolvedTheme === "dark" ? "bg-white text-black hover:bg-gray-200" : "bg-black text-white hover:bg-gray-800"
  }`;

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-black">
      <div className="flex items-center space-x-2">
        <Link href="/" onClick={() => window.location.reload()}>
          <div className="flex items-center space-x-2 cursor-pointer">
            <div>
              <h1 className="font-semibold text-lg flex items-center">
                <span
                  className={`font-sans mr-1 select-none` + (resolvedTheme === "dark" ? " text-white" : " text-black")}
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  aria-label="Swift Logo"
                >
                  {"{⚡️}"}
                </span>
                Swift
              </h1>
              <p className="text-xs font-medium leading-tight -mt-1">by Lumix Labs</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="flex items-center space-x-2">
        <HeaderActionButton
          href="https://calendly.com/karoriwal/swift"
          label="Book a Demo"
          ariaLabel="Book a Demo"
          target="_blank"
          rel="noopener noreferrer"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
          }
          className={buttonStyle}
        />
        <HeaderActionButton
          href="https://docs.google.com/presentation/d/1i3VbI0HzMQcodzJs8n_66absswe0SxkKM0BaPPBFJHA/edit?usp=sharing"
          label="Investors Pitch Deck"
          ariaLabel="Investors Pitch Deck"
          target="_blank"
          rel="noopener noreferrer"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m4 0h1v4h1M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          }
          className={buttonStyle}
        />

        <RepositoriesDropdown resolvedTheme={resolvedTheme} />
        <AIAdvisorsDropdown resolvedTheme={resolvedTheme} />

        <HeaderActionButton
          href="#"
          label="New Chat"
          ariaLabel="New Chat"
          onClick={(e) => {
            e.preventDefault();
            handleNewChat();
          }}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
          }
          className={buttonStyle}
        />
        <ThemeToggle />
      </div>
    </header>
  );
}
