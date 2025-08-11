import React, { useEffect } from 'react';
import { ChatFab } from './ChatFab';
import { ChatPanel } from './ChatPanel';
import { useChat } from './useChat';
import { useChatContext } from '../../context/ChatProvider';

export function ChatWidget() {
  const { project, context } = useChatContext();
  const chat = useChat({ project, context });

  // Initialize chat when project changes
  useEffect(() => {
    if (project && project !== 'unknown') {
      chat.initializeChat();
    }
  }, [project, chat.initializeChat]);

  return (
    <>
      <ChatFab 
        onClick={() => chat.setOpen(true)}
        hasUnread={false} // Could be enhanced to track unread state
      />
      
      <ChatPanel
        open={chat.open}
        onClose={() => chat.setOpen(false)}
        messages={chat.messages}
        onSendMessage={chat.send}
        loading={chat.loading}
        error={chat.error}
        onClearHistory={chat.clearHistory}
        onStop={chat.stop}
        includeContext={chat.includeContext}
        onContextToggle={chat.setIncludeContext}
      />
    </>
  );
}
