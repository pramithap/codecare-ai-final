import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';
import type { ChatMessage } from './useChat';
import type { Components } from 'react-markdown';

interface MessageBubbleProps {
  message: ChatMessage;
}

interface CodeBlockProps {
  children: string;
  className?: string;
}

function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  const language = className?.replace('language-', '') || 'text';
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="relative group">
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label="Copy code"
      >
        {copied ? (
          <CheckIcon className="h-4 w-4 text-green-400" />
        ) : (
          <ClipboardIcon className="h-4 w-4" />
        )}
      </button>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers={language !== 'text' && children.split('\n').length > 3}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const components: Partial<Components> = {
    code: ({ className, children, ...props }) => {
      const content = String(children).replace(/\n$/, '');
      
      if (!className) {
        return (
          <code
            className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-gray-200 font-mono text-xs"
            {...props}
          >
            {content}
          </code>
        );
      }

      return <CodeBlock className={className}>{content}</CodeBlock>;
    },
    p: ({ children }) => (
      <p className="text-sm leading-relaxed mb-2 last:mb-0">
        {children}
      </p>
    ),
    ul: ({ children }) => (
      <ul className="text-sm space-y-1 ml-4 mb-2">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-sm space-y-1 ml-4 mb-2">
        {children}
      </ol>
    ),
    h1: ({ children }) => (
      <h1 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-base font-bold mb-2 text-gray-900 dark:text-gray-100">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-sm font-bold mb-1 text-gray-900 dark:text-gray-100">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-3 italic text-gray-700 dark:text-gray-300 text-sm">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message bubble */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isUser
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-bl-md'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:p-0 prose-pre:m-0">
              <ReactMarkdown components={components}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {timestamp}
        </div>
      </div>
    </div>
  );
}
