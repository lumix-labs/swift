"use client"
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

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
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
}

// Create the context with default values
const ChatContext = createContext<ChatContextType>({
  messages: [],
  addMessage: () => {},
  clearMessages: () => {},
  isLoading: false,
  setIsLoading: () => {},
  sessions: [],
  currentSessionId: null,
  createNewSession: () => {},
  switchSession: () => {},
  deleteSession: () => {},
  selectedModel: 'gemini',
  setSelectedModel: () => {},
});

// Create a provider component
export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState('gemini');

  // Generate a unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Create a new session
  const createNewSession = () => {
    const newSessionId = generateId();
    const newSession: ChatSession = {
      id: newSessionId,
      title: `Chat ${new Date().toLocaleString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
  };

  // Load sessions from localStorage on initial render
  useEffect(() => {
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
      setSessions(parsedSessions);
      
      // Load current session if exists
      const savedCurrentSessionId = localStorage.getItem('currentSessionId');
      if (savedCurrentSessionId && parsedSessions.some((s: SavedSession) => s.id === savedCurrentSessionId)) {
        setCurrentSessionId(savedCurrentSessionId);
        const currentSession = parsedSessions.find((s: SavedSession) => s.id === savedCurrentSessionId);
        if (currentSession) {
          setMessages(currentSession.messages);
        }
      } else if (parsedSessions.length > 0) {
        // Default to most recent session
        setCurrentSessionId(parsedSessions[0].id);
        setMessages(parsedSessions[0].messages);
      } else {
        // Create a new session if none exist
        createNewSession();
      }
    } else {
      // Create a new session if none exist
      createNewSession();
    }

    // Load selected model if exists
    const savedModel = localStorage.getItem('selectedModel');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('chatSessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // Save current session ID whenever it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('currentSessionId', currentSessionId);
    }
  }, [currentSessionId]);

  // Save selected model whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  // Switch to a different session
  const switchSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
    }
  };

  // Delete a session
  const deleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    
    // Update localStorage immediately to ensure deletion is persisted
    localStorage.setItem('chatSessions', JSON.stringify(updatedSessions));
    
    if (currentSessionId === sessionId) {
      if (updatedSessions.length > 0) {
        switchSession(updatedSessions[0].id);
      } else {
        createNewSession();
      }
    }
  };

  // Add a message to the chat
  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    
    // Update the current session with the new message
    if (currentSessionId) {
      setSessions(prev => prev.map(session => {
        if (session.id === currentSessionId) {
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
  };

  // Clear all messages in the current session
  const clearMessages = () => {
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
  };

  return (
    <ChatContext.Provider value={{
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
      selectedModel,
      setSelectedModel,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

// Create a hook for using the chat context
export function useChat() {
  return useContext(ChatContext);
}
