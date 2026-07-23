'use client';

import React, { useRef, useEffect } from 'react';
import { useAIAssistant } from '@/hooks/use-ai-assistant';
import { useChatUI } from '@/contexts/chat-ui-context';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { Draggable } from './draggable';
import { Button } from '@/components/ui/button';
import { Loader2, Minimize2, Maximize2, X, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AIAssistant() {
  const {
    messages,
    isLoading,
    error,
    streamingMessage,
    sendMessage,
    clearChat,
  } = useAIAssistant();

  const {
    isOpen,
    isMinimized,
    position,
    closeChat,
    toggleMinimize,
    updatePosition,
  } = useChatUI();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change or streaming message updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingMessage]);

  if (!isOpen) {
    return null;
  }

  return (
    <Draggable
      position={position}
      onPositionChange={updatePosition}
      className={cn(
        'rounded-md border bg-background shadow-lg',
        isMinimized ? 'w-auto' : 'w-80'
      )}
    >
      {isMinimized ? (
        <div className="flex items-center gap-2 p-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleMinimize}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Wand2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Claude Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-8 w-8"
            onClick={closeChat}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b p-2">
            <div className="flex items-center gap-1">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Claude Assistant</span>
            </div>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMinimize}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={closeChat}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex h-80 flex-col">
            <div className="flex-1 overflow-y-auto p-2">
              {messages.length === 0 && !streamingMessage ? (
                <div className="flex h-full items-center justify-center p-4 text-center">
                  <div className="space-y-2">
                    <Wand2 className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Ask Claude anything about your workflow
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatMessage key={index} message={message} />
                  ))}

                  {/* Display streaming message without cursor */}
                  {streamingMessage && (
                    <div className="flex w-full justify-start gap-2 p-2">
                      <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Wand2 className="h-4 w-4" />
                      </div>
                      <div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm">
                        <span className="transition-all duration-100 ease-in-out">
                          {streamingMessage}
                        </span>
                      </div>
                    </div>
                  )}

                  {isLoading && !streamingMessage && (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {error && (
                    <div className="p-2 text-sm text-red-500">
                      Error: {error}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
          </div>
        </>
      )}
    </Draggable>
  );
}
