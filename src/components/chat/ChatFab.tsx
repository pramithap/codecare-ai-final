import React, { useState } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

interface ChatFabProps {
  onClick: () => void;
  hasUnread?: boolean;
}

export function ChatFab({ onClick, hasUnread = false }: ChatFabProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50">
          Ask CodeCare AI
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        className="fixed bottom-4 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-offset-2 z-50 flex items-center justify-center"
        aria-label="Open AI Assistant"
        style={{ zIndex: 50 }}
      >
        <ChatBubbleLeftRightIcon className="h-6 w-6" />
        
        {/* Unread indicator */}
        {hasUnread && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        )}
        
        {/* Pulse animation for first-time users */}
        <div className="absolute inset-0 rounded-full bg-indigo-400 opacity-75 animate-ping"></div>
      </button>
    </div>
  );
}
