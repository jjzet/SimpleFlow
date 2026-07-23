'use client';

import React from 'react';
import { FavoriteScopesProvider } from '@/contexts/favorite-scopes-context';
import { ChatUIProvider } from '@/contexts/chat-ui-context';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <FavoriteScopesProvider>
      <ChatUIProvider>{children}</ChatUIProvider>
    </FavoriteScopesProvider>
  );
}
