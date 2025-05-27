/**
 * Server-Sent Events endpoint for real-time auth status updates
 */

import { NextRequest } from 'next/server';

// Store active SSE connections
const connections = new Map<string, ReadableStreamDefaultController<any>>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this session
      connections.set(sessionId, controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`)
      );

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        connections.delete(sessionId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// Helper function to send auth updates to connected clients
export function sendAuthUpdate(sessionId: string, state: any) {
  const controller = connections.get(sessionId);
  if (controller) {
    const encoder = new TextEncoder();
    try {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'auth-update', state })}\n\n`)
      );
    } catch (error) {
      // Client might have disconnected
      connections.delete(sessionId);
    }
  }
}
