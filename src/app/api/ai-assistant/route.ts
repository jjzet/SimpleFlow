import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(req: NextRequest) {
  console.log('🤖 AI Assistant API called');

  try {
    const { messages, stream } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      console.error('❌ Invalid request: messages array is required');
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    console.log(`📨 Sending ${messages.length} messages to Claude`);

    // Handle streaming response
    if (stream) {
      console.log('🌊 Using streaming response');

      const stream = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1024,
        messages: messages,
        stream: true,
      });

      // Create a TransformStream to handle the streaming response
      const encoder = new TextEncoder();
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      // Process the stream
      (async () => {
        try {
          for await (const chunk of stream) {
            // Send each chunk as a JSON string
            const json = JSON.stringify(chunk);
            await writer.write(encoder.encode(`data: ${json}\n\n`));
          }
          await writer.close();
        } catch (error) {
          console.error('❌ Error in streaming response:', error);
          await writer.abort(error);
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const response = await anthropic.messages.create({
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 1024,
      messages: messages,
    });

    console.log('✅ Claude response received successfully');

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error in AI Assistant API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
