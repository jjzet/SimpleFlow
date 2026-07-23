'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useChatUIState } from '@/hooks/use-chat-ui-state';

interface ChatUIContextType {
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  openChat: () => void;
  closeChat: () => void;
  toggleMinimize: () => void;
  updatePosition: (position: { x: number; y: number }) => void;
}

const ChatUIContext = createContext<ChatUIContextType | undefined>(undefined);

export function ChatUIProvider({ children }: { children: ReactNode }) {
  const chatUIState = useChatUIState();

  return (
    <ChatUIContext.Provider value={chatUIState}>
      {children}
    </ChatUIContext.Provider>
  );
}

export function useChatUI() {
  const context = useContext(ChatUIContext);

  if (context === undefined) {
    throw new Error('useChatUI must be used within a ChatUIProvider');
  }

  return context;
}
