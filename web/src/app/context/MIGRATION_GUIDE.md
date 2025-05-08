# Chat Context Migration Guide

This document provides guidance for migrating from the legacy context structure to the new modular chat context architecture.

## Overview of Changes

The chat context system has been refactored to:

1. Use a modern reducer pattern for state management
2. Separate concerns into smaller, more maintainable modules
3. Provide better TypeScript typing and error handling
4. Optimize performance with proper memoization
5. Maintain backward compatibility during the transition

## Migration Steps

### Step 1: Update Imports

**Old import:**
```tsx
import { useChat } from "../context/chat/ChatContextProvider";
```

**New import:**
```tsx
import { useChat } from "../context/ChatProvider";
```

### Step 2: Update Provider Usage

**Old provider usage:**
```tsx
<ChatProvider>
  <YourComponent />
</ChatProvider>
```

**New provider usage (same API):**
```tsx
<ChatProvider>
  <YourComponent />
</ChatProvider>
```

### Step 3: Access State and Actions

The new context exposes the same API for backward compatibility:

```tsx
const { 
  messages, 
  addMessage,
  clearMessages,
  sessions,
  currentSessionId,
  createNewSession,
  // ...other properties
} = useChat();
```

## New Features

The new context provides additional features:

1. Better performance with optimized re-renders
2. Action creators with proper TypeScript typing
3. Separated state and actions for more control

## Advanced Usage

For components that need specific context slices, use specialized hooks:

```tsx
import { useChatState, useChatDispatch } from "../context/ChatProvider";

function MyComponent() {
  // Access only the state
  const { messages, sessions } = useChatState();
  
  // Get the dispatch function for advanced usage
  const dispatch = useChatDispatch();
  
  return (
    // Your component
  );
}
```

## Utility Functions

Common utilities have been moved to dedicated modules:

```tsx
// Generate IDs
import { generateId } from "../lib/utils/id";

// Format messages
import { formatMessageContent } from "../lib/utils/formatters";

// Storage operations
import { saveToStorage, loadFromStorage } from "../lib/utils/storage";

// Session operations
import { saveSessions, loadSessions } from "../lib/utils/session";
```

## Deprecation Schedule

- Phase 1 (Current): Dual implementation, both old and new APIs work
- Phase 2 (Next release): Old APIs marked deprecated with console warnings
- Phase 3 (Future release): Legacy APIs removed

Please migrate your components to the new API to prevent future issues.
