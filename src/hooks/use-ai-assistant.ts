import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ChatState,
  Message,
  ClaudeResponse,
  ClaudeStreamChunk,
} from '@/types/ai-assistant';

export function useAIAssistant() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
    streamingMessage: null,
  });

  // Use refs to manage streaming state without triggering re-renders
  const streamingTextRef = useRef<string>('');
  const displayedTextRef = useRef<string>('');
  const isStreamingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const bufferRef = useRef<string>('');

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Animation function for smooth text rendering
  const animateText = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    // Throttle updates to every 50ms for a slower, more natural animation
    if (timeSinceLastUpdate >= 50) {
      lastUpdateTimeRef.current = now;

      // If there's more text to display
      if (displayedTextRef.current.length < streamingTextRef.current.length) {
        // Calculate how many characters to add based on buffer size
        // Reduced character count for slower animation
        const bufferSize =
          streamingTextRef.current.length - displayedTextRef.current.length;

        // Slower character addition rate - max 2 chars at a time, and slower overall rate
        const charsToAdd = Math.max(
          1,
          Math.min(2, Math.floor(bufferSize / 20))
        );

        // Add characters to the displayed text
        displayedTextRef.current = streamingTextRef.current.substring(
          0,
          displayedTextRef.current.length + charsToAdd
        );

        // Update state with the new displayed text
        setState((prev) => ({
          ...prev,
          streamingMessage: displayedTextRef.current,
        }));
      } else if (
        isStreamingRef.current === false &&
        displayedTextRef.current === streamingTextRef.current
      ) {
        // If streaming is complete and all text is displayed
        if (streamingTextRef.current) {
          // Add the final message
          const assistantMessage: Message = {
            role: 'assistant',
            content: streamingTextRef.current,
          };

          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, assistantMessage],
            isLoading: false,
            streamingMessage: null,
          }));

          // Reset refs
          streamingTextRef.current = '';
          displayedTextRef.current = '';
          bufferRef.current = '';
        }

        // Stop animation
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }

        return;
      }
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animateText);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      console.log('🔤 Sending message to AI Assistant:', content);

      // Add user message to the chat
      const userMessage: Message = { role: 'user', content };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
        streamingMessage: '',
      }));

      // Reset streaming state
      streamingTextRef.current = '';
      displayedTextRef.current = '';
      bufferRef.current = '';
      isStreamingRef.current = true;
      lastUpdateTimeRef.current = Date.now();

      // Start animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animateText);

      try {
        // Prepare messages for API
        const apiMessages = [...state.messages, userMessage];

        // Call the streaming API
        const response = await fetch('/api/ai-assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: apiMessages,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('Response body is null');
        }

        // Process the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let done = false;

        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;

          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6)) as ClaudeStreamChunk;

                // Handle different types of chunks
                if (data.type === 'content_block_delta' && data.delta?.text) {
                  // Add to buffer
                  bufferRef.current += data.delta.text;

                  // Update the full text (will be animated to the user)
                  streamingTextRef.current += data.delta.text;
                } else if (data.type === 'message_stop') {
                  // Mark streaming as complete
                  isStreamingRef.current = false;
                  console.log('✅ Claude streaming response completed');
                }
              } catch (error) {
                console.error('❌ Error parsing stream chunk:', error);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in AI Assistant:', error);
        isStreamingRef.current = false;

        setState((prev) => ({
          ...prev,
          isLoading: false,
          streamingMessage: null,
          error:
            error instanceof Error
              ? error.message
              : 'An unknown error occurred',
        }));

        // Stop animation
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      }
    },
    [state.messages, animateText]
  );

  const clearChat = useCallback(() => {
    console.log('🧹 Clearing chat history');

    // Stop any ongoing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Reset refs
    streamingTextRef.current = '';
    displayedTextRef.current = '';
    bufferRef.current = '';
    isStreamingRef.current = false;

    setState({
      messages: [],
      isLoading: false,
      error: null,
      streamingMessage: null,
    });
  }, []);

  return {
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    streamingMessage: state.streamingMessage,
    sendMessage,
    clearChat,
  };
}
