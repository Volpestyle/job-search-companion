/**
 * Server-Sent Events endpoint for real-time progress updates
 */

import { NextRequest } from 'next/server';

// Store active connections
const progressConnections = new Map<string, ReadableStreamDefaultController>();

// Store progress updates
const progressUpdates = new Map<string, Array<any>>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId') || 'default';

  // Set up SSE headers
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  };

  // Create a stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this session
      progressConnections.set(sessionId, controller);

      // Send initial connection message
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`)
      );

      // Send any pending updates
      const pending = progressUpdates.get(sessionId);
      if (pending) {
        pending.forEach((update) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
        });
        progressUpdates.delete(sessionId);
      }
    },
    cancel() {
      // Clean up when client disconnects
      progressConnections.delete(sessionId);
    },
  });

  return new Response(stream, { headers });
}

// Helper function to send progress updates
export function sendProgressUpdate(
  sessionId: string,
  update: {
    step: string;
    message: string;
    percentage?: number;
    details?: any;
  }
) {
  const controller = progressConnections.get(sessionId);

  if (controller) {
    // Send update directly if connected
    const encoder = new TextEncoder();
    try {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: 'progress',
            timestamp: new Date().toISOString(),
            ...update,
          })}\n\n`
        )
      );
    } catch (error) {
      // Connection might be closed
      progressConnections.delete(sessionId);
    }
  } else {
    // Store update for when client reconnects
    const updates = progressUpdates.get(sessionId) || [];
    updates.push({
      type: 'progress',
      timestamp: new Date().toISOString(),
      ...update,
    });
    progressUpdates.set(sessionId, updates);
  }
}
