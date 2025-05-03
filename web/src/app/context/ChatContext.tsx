"use client"
import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { LLMModel, Repository } from '../lib/types/entities';

// Define message types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Define chat session type
export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
  modelId?: string;
  repositoryId?: string;
}

// Define saved session interface for localStorage
interface SavedSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  modelId?: string;
  repositoryId?: string;
}

// Define the context type
interface ChatContextType {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  createNewSession: () => void;
  switchSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  selectedModelId: string | null;
  setSelectedModelId: (modelId: string | null) => void;
  selectedRepositoryId: string | null;
  setSelectedRepositoryId: (repoId: string | null) => void;
}

// Maximum number of sessions to keep in storage
const MAX_SESSIONS = 5;

// Create the context with default values
const ChatContext = createContext<ChatContextType>({
  messages: [],
  addMessage: () => { },
  clearMessages: () => { },
  isLoading: false,
  setIsLoading: () => { },
  sessions: [],
  currentSessionId: null,
  createNewSession: () => { },
  switchSession: () => { },
  deleteSession: () => { },
  selectedModelId: null,
  setSelectedModelId: () => { },
  selectedRepositoryId: null,
  setSelectedRepositoryId: () => { },
});

// Create a provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState<string | null>(null);
  const [storageUpdating, setStorageUpdating] = useState(false);

  // Generate a unique ID
  const generateId = useCallback(() => Math.random().toString(36).substring(2, 9), []);

  // Create a new session
  const createNewSession = useCallback(() => {
    const newSessionId = generateId();
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [],
      modelId: selectedModelId || undefined,
      repositoryId: selectedRepositoryId || undefined
    };

    // Limit to MAX_SESSIONS by removing the oldest ones if needed
    setSessions(prev => {
      const newSessions = [newSession, ...prev];
      return newSessions.slice(0, MAX_SESSIONS);
    });

    setCurrentSessionId(newSessionId);
    setMessages([]);
  }, [generateId, selectedModelId, selectedRepositoryId]);

  // Batched localStorage update
  const updateLocalStorage = useCallback((updatedSessions: ChatSession[], updatedCurrentSessionId: string | null) => {
    setStorageUpdating(true);

    try {
      // Convert dates to strings for storage
      const sessionsToStore = updatedSessions.map(session => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        }))
      }));

      localStorage.setItem('chatSessions', JSON.stringify(sessionsToStore));

      if (updatedCurrentSessionId) {
        localStorage.setItem('currentSessionId', updatedCurrentSessionId);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    } finally {
      setStorageUpdating(false);
    }
  }, []);

  // Load sessions from localStorage on initial render
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('chatSessions');

      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions).map((session: SavedSession) => ({
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((msg) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));

        // Only keep MAX_SESSIONS
        const limitedSessions = parsedSessions.slice(0, MAX_SESSIONS);
        setSessions(limitedSessions);

        // Load current session if exists
        const savedCurrentSessionId = localStorage.getItem('currentSessionId');
        if (savedCurrentSessionId && limitedSessions.some((s: ChatSession) => s.id === savedCurrentSessionId)) {
          setCurrentSessionId(savedCurrentSessionId);
          const currentSession = limitedSessions.find((s: ChatSession) => s.id === savedCurrentSessionId);
          if (currentSession) {
            setMessages(currentSession.messages);
            if (currentSession.modelId) {
              setSelectedModelId(currentSession.modelId);
            }
            if (currentSession.repositoryId) {
              setSelectedRepositoryId(currentSession.repositoryId);
            }
          }
        } else if (limitedSessions.length > 0) {
          // Default to most recent session
          setCurrentSessionId(limitedSessions[0].id);
          setMessages(limitedSessions[0].messages);
          if (limitedSessions[0].modelId) {
            setSelectedModelId(limitedSessions[0].modelId);
          }
          if (limitedSessions[0].repositoryId) {
            setSelectedRepositoryId(limitedSessions[0].repositoryId);
          }
        } else {
          // Create a new session if none exist
          createNewSession();
        }
      } else {
        // Create a new session if none exist
        createNewSession();
      }

      // Load selected model and repository if exists
      const savedModelId = localStorage.getItem('selectedModelId');
      if (savedModelId) {
        setSelectedModelId(savedModelId);
      }
      
      const savedRepositoryId = localStorage.getItem('selectedRepositoryId');
      if (savedRepositoryId) {
        setSelectedRepositoryId(savedRepositoryId);
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      createNewSession(); // Fallback to new session on error
    }
  }, [createNewSession]);

  // Save sessions to localStorage with debounce (only when not already updating)
  useEffect(() => {
    if (sessions.length > 0 && !storageUpdating) {
      const timer = setTimeout(() => {
        updateLocalStorage(sessions, currentSessionId);
      }, 300); // 300ms debounce

      return () => clearTimeout(timer);
    }
  }, [sessions, currentSessionId, updateLocalStorage, storageUpdating]);

  // Save selected model and repository whenever they change
  useEffect(() => {
    if (selectedModelId !== null) {
      localStorage.setItem('selectedModelId', selectedModelId);
      
      // Update current session with selected model
      if (currentSessionId) {
        setSessions(prev => prev.map(session => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              modelId: selectedModelId,
              updatedAt: new Date()
            };
          }
          return session;
        }));
      }
    } else {
      localStorage.removeItem('selectedModelId');
    }
  }, [selectedModelId, currentSessionId]);

  useEffect(() => {
    if (selectedRepositoryId !== null) {
      localStorage.setItem('selectedRepositoryId', selectedRepositoryId);
      
      // Update current session with selected repository
      if (currentSessionId) {
        setSessions(prev => prev.map(session => {
          if (session.id === currentSessionId) {
            return {
              ...session,
              repositoryId: selectedRepositoryId,
              updatedAt: new Date()
            };
          }
          return session;
        }));
      }
    } else {
      localStorage.removeItem('selectedRepositoryId');
    }
  }, [selectedRepositoryId, currentSessionId]);

  // Switch to a different session
  const switchSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      
      // Update selected model and repository based on session
      if (session.modelId) {
        setSelectedModelId(session.modelId);
      }
      if (session.repositoryId) {
        setSelectedRepositoryId(session.repositoryId);
      }
    }
  }, [sessions]);

  // Delete a session
  const deleteSession = useCallback((sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);

    if (currentSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        switchSession(updatedSessions[0].id);
      } else {
        createNewSession();
      }
    }
  }, [sessions, currentSessionId, switchSession, createNewSession]);

  // Add a message to the chat
  const addMessage = useCallback((message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);

    // Update the current session with the new message
    if (currentSessionId) {
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          const updatedMessages = [...session.messages, newMessage];
          return {
            ...session,
            messages: updatedMessages,
            updatedAt: new Date(),
            // Update title based on first user message if this is the first message
            title: session.messages.length === 0 && message.role === 'user'
              ? message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
              : session.title
          };
        }
        return session;
      }));
    }
  }, [currentSessionId, generateId]);

  // Clear all messages in the current session
  const clearMessages = useCallback(() => {
    setMessages([]);

    // Update the current session to have no messages
    if (currentSessionId) {
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          return {
            ...session,
            messages: [],
            updatedAt: new Date()
          };
        }
        return session;
      }));
    }
  }, [currentSessionId]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    messages,
    addMessage,
    clearMessages,
    isLoading,
    setIsLoading,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    selectedModelId,
    setSelectedModelId,
    selectedRepositoryId,
    setSelectedRepositoryId,
  }), [
    messages,
    addMessage,
    clearMessages,
    isLoading,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    selectedModelId,
    setSelectedModelId,
    selectedRepositoryId,
    setSelectedRepositoryId,
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

// Create a hook for using the chat context
export function useChat() {
  return useContext(ChatContext);
}
