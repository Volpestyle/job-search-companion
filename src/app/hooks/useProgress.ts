'use client';

import { useEffect, useState, useCallback } from 'react';

export interface ProgressUpdate {
  type: 'connected' | 'progress' | 'error' | 'complete';
  step?: string;
  message?: string;
  percentage?: number;
  timestamp?: string;
  details?: any;
}

export function useProgress(sessionId: string = 'default') {
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    const eventSource = new EventSource(`/api/progress?sessionId=${sessionId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as ProgressUpdate;

        if (update.type === 'connected') {
          setIsConnected(true);
        } else {
          setProgress((prev) => [...prev, update]);
          setCurrentProgress(update);

          // Auto-clear completed status after a delay
          if (update.percentage === 100) {
            setTimeout(() => {
              setCurrentProgress(null);
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Failed to parse progress update:', error);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      eventSource.close();

      // Attempt to reconnect after 1 second
      setTimeout(() => {
        connect();
      }, 1000);
    };

    return eventSource;
  }, [sessionId]);

  useEffect(() => {
    const eventSource = connect();

    return () => {
      eventSource.close();
    };
  }, [connect]);

  const clearProgress = useCallback(() => {
    setProgress([]);
    setCurrentProgress(null);
  }, []);

  return {
    progress,
    currentProgress,
    isConnected,
    clearProgress,
  };
}
