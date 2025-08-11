import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  MinusIcon,
  TrashIcon,
  Cog6ToothIcon,
  PaperAirplaneIcon,
  StopIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { MessageBubble } from './MessageBubble';
import { SuggestedPrompts } from './SuggestedPrompts';
import type { ChatMessage, ContextToggles } from './useChat';

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  loading: boolean;
  error: string | null;
  onClearHistory: () => void;
  onStop: () => void;
  includeContext: ContextToggles;
  onContextToggle: (context: ContextToggles) => void;
}

export function ChatPanel({
  open,
  onClose,
  messages,
  onSendMessage,
  loading,
  error,
  onClearHistory,
  onStop,
  includeContext,
  onContextToggle,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Handle ESC key to close panel
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  // Focus management for accessibility
  useEffect(() => {
    if (open && panelRef.current) {
      // Focus trap implementation would go here
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      if (firstElement) {
        firstElement.focus();
      }
    }
  }, [open]);

  const handleSend = () => {
    const message = input.trim();
    if (message && !loading) {
      onSendMessage(message);
      setInput('');
      // Auto-resize textarea
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter = new line, let default behavior happen
        return;
      } else {
        // Enter = send message
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const handlePromptSelect = (prompt: string) => {
    setInput(prompt);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleContext = (key: keyof ContextToggles) => {
    onContextToggle({
      ...includeContext,
      [key]: !includeContext[key],
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-25 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-96 max-w-[95vw] h-[70vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col z-50"
        role="dialog"
        aria-labelledby="chat-title"
        aria-describedby="chat-description"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 id="chat-title" className="font-semibold text-gray-900 dark:text-gray-100">
              Assistant
            </h2>
            <p id="chat-description" className="text-xs text-gray-500 dark:text-gray-400">
              Upgrade & Compatibility help
            </p>
          </div>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Settings"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={onClearHistory}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              aria-label="Clear conversation"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              aria-label="Close chat"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Include Context
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(includeContext).map(([key, value]) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleContext(key as keyof ContextToggles)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300 capitalize">
                    {key === 'cves' ? 'CVEs' : key}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <SuggestedPrompts onPromptSelect={handlePromptSelect} disabled={loading} />
          ) : (
            <>
              {messages.map((message, index) => (
                <MessageBubble key={`${message.timestamp}-${index}`} message={message} />
              ))}
              
              {/* Loading indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-2xl px-4 py-2 rounded-bl-md">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask about upgrades, breaking changes, or security issues..."
              className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[40px] max-h-[120px]"
              rows={1}
              disabled={loading}
            />
            
            {loading ? (
              <button
                onClick={onStop}
                className="p-2 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 transition-colors"
                aria-label="Stop generation"
              >
                <StopIcon className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-zinc-700 text-white disabled:text-gray-400 dark:disabled:text-gray-500 transition-colors disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </>
  );
}
