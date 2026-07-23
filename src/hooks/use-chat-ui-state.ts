import { useState, useCallback } from 'react';
import { ChatUIState, Position } from '@/types/ai-assistant';

export function useChatUIState() {
  const [state, setState] = useState<ChatUIState>({
    isOpen: false,
    isMinimized: false,
    position: { x: 20, y: 80 }, // Default position
  });

  const openChat = useCallback(() => {
    console.log('🔓 Opening chat');
    setState((prev) => ({
      ...prev,
      isOpen: true,
      isMinimized: false,
    }));
  }, []);

  const closeChat = useCallback(() => {
    console.log('🔒 Closing chat');
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const toggleMinimize = useCallback(() => {
    console.log(
      state.isMinimized ? '📈 Maximizing chat' : '📉 Minimizing chat'
    );
    setState((prev) => ({
      ...prev,
      isMinimized: !prev.isMinimized,
    }));
  }, [state.isMinimized]);

  const updatePosition = useCallback((position: Position) => {
    setState((prev) => ({
      ...prev,
      position,
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    isMinimized: state.isMinimized,
    position: state.position,
    openChat,
    closeChat,
    toggleMinimize,
    updatePosition,
  };
}
