import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { ChatContext } from '../components/chat/useChat';

interface ChatProviderState {
  project: string;
  context: ChatContext;
}

interface ChatProviderContextType {
  chatState: ChatProviderState;
  updateProject: (project: string) => void;
  updateContext: (context: Partial<ChatContext>) => void;
  setContext: (context: ChatContext) => void;
}

const ChatProviderContext = createContext<ChatProviderContextType | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [chatState, setChatState] = useState<ChatProviderState>({
    project: 'unknown',
    context: {},
  });

  const updateProject = (project: string) => {
    setChatState(prev => ({
      ...prev,
      project,
    }));
  };

  const updateContext = (newContext: Partial<ChatContext>) => {
    setChatState(prev => ({
      ...prev,
      context: {
        ...prev.context,
        ...newContext,
      },
    }));
  };

  const setContext = (context: ChatContext) => {
    setChatState(prev => ({
      ...prev,
      context,
    }));
  };

  const value: ChatProviderContextType = {
    chatState,
    updateProject,
    updateContext,
    setContext,
  };

  return (
    <ChatProviderContext.Provider value={value}>
      {children}
    </ChatProviderContext.Provider>
  );
}

export function useChatProvider() {
  const context = useContext(ChatProviderContext);
  if (!context) {
    throw new Error('useChatProvider must be used within a ChatProvider');
  }
  return context;
}

// Helper hook for common operations
export function useChatContext() {
  const { chatState } = useChatProvider();
  return chatState;
}
