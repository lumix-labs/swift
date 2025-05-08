"use client";

import { render, screen, fireEvent, act } from "@testing-library/react";
import { ChatProvider, useChat } from "../ChatProvider";

// Mock the localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: function (key: string) {
      return store[key] || null;
    },
    setItem: function (key: string, value: string) {
      store[key] = value.toString();
    },
    removeItem: function (key: string) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Test component that uses the context
function TestComponent() {
  const { messages, addMessageLegacy, clearMessages, sessions, createNewSession, deleteSession } = useChat();

  return (
    <div>
      <div data-testid="message-count">{messages.length}</div>
      <div data-testid="session-count">{sessions.length}</div>

      <button
        onClick={() =>
          addMessageLegacy({
            role: "user",
            content: "Test message",
          })
        }
      >
        Add Message
      </button>

      <button onClick={clearMessages}>Clear Messages</button>

      <button onClick={createNewSession}>New Session</button>

      {sessions.length > 1 && <button onClick={() => deleteSession(sessions[0].id)}>Delete Session</button>}
    </div>
  );
}

describe("ChatProvider", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
  });

  it("should initialize with a default session", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Should start with 0 messages and 1 session
    expect(screen.getByTestId("message-count")).toHaveTextContent("0");
    expect(screen.getByTestId("session-count")).toHaveTextContent("1");
  });

  it("should allow adding messages", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Add a message
    fireEvent.click(screen.getByText("Add Message"));

    // Should now have 1 message
    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
  });

  it("should allow clearing messages", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Add a message
    fireEvent.click(screen.getByText("Add Message"));

    // Should now have 1 message
    expect(screen.getByTestId("message-count")).toHaveTextContent("1");

    // Clear messages
    fireEvent.click(screen.getByText("Clear Messages"));

    // Should now have 0 messages
    expect(screen.getByTestId("message-count")).toHaveTextContent("0");
  });

  it("should allow creating new sessions", () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Create a new session
    fireEvent.click(screen.getByText("New Session"));

    // Should now have 2 sessions
    expect(screen.getByTestId("session-count")).toHaveTextContent("2");
  });

  it("should allow deleting sessions", async () => {
    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Create a new session so we have 2
    fireEvent.click(screen.getByText("New Session"));

    // Should now have 2 sessions
    expect(screen.getByTestId("session-count")).toHaveTextContent("2");

    // Delete a session
    fireEvent.click(screen.getByText("Delete Session"));

    // Should now have 1 session
    expect(screen.getByTestId("session-count")).toHaveTextContent("1");
  });
});
