import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatContext {
  libs?: Array<{
    name: string;
    currentVersion?: string;
    latestVersion?: string;
    type?: string;
  }>;
  security?: Array<{
    name: string;
    severity: string;
    count: number;
  }>;
  eolSoon?: Array<{
    name: string;
    eolDate: string;
  }>;
  compat?: {
    avg: number | null;
    min: number | null;
    notes?: string[];
  };
}

export interface ContextToggles {
  dependencies: boolean;
  eol: boolean;
  cves: boolean;
  compatibility: boolean;
}

interface UseChatOptions {
  project?: string;
  context?: ChatContext;
}

export function useChat(options: UseChatOptions = {}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeContext, setIncludeContext] = useState<ContextToggles>({
    dependencies: true,
    eol: true,
    cves: true,
    compatibility: true,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const { project = 'unknown', context } = options;

  // Load messages from localStorage on mount
  const loadMessages = useCallback(() => {
    try {
      const saved = localStorage.getItem(`chat:${project}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
    }
  }, [project]);

  // Save messages to localStorage
  const saveMessages = useCallback((newMessages: ChatMessage[]) => {
    try {
      localStorage.setItem(`chat:${project}`, JSON.stringify(newMessages));
    } catch (error) {
      console.warn('Failed to save chat history:', error);
    }
  }, [project]);

  // Load messages when project changes
  const initializeChat = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  // Clear chat history for current project
  const clearHistory = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem(`chat:${project}`);
    } catch (error) {
      console.warn('Failed to clear chat history:', error);
    }
    setError(null);
  }, [project]);

  // Stop current request
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  // Send message to API
  const send = useCallback(async (message: string) => {
    if (!message.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);
    setError(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      // Build context based on toggles
      const filteredContext: ChatContext = {};
      
      if (context) {
        if (includeContext.dependencies && context.libs) {
          filteredContext.libs = context.libs;
        }
        if (includeContext.eol && context.eolSoon) {
          filteredContext.eolSoon = context.eolSoon;
        }
        if (includeContext.cves && context.security) {
          filteredContext.security = context.security;
        }
        if (includeContext.compatibility && context.compat) {
          filteredContext.compat = context.compat;
        }
      }

      const requestBody = {
        project,
        message: message.trim(),
        history: messages.slice(-10), // Last 10 messages for context
        context: filteredContext,
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'Sorry, I could not generate a response.',
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      saveMessages(finalMessages);

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was cancelled, don't show error
        return;
      }
      
      console.error('Chat API error:', error);
      let errorMessage = 'Failed to get response from AI assistant';
      
      if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded. Please try again in a moment.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, loading, project, context, includeContext, saveMessages]);

  return {
    open,
    setOpen,
    messages,
    send,
    stop,
    loading,
    error,
    includeContext,
    setIncludeContext,
    clearHistory,
    initializeChat,
  };
}
