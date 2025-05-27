'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuthState } from '@/lib/auth/auth-flow-manager';

export function useAuthStatus(sessionId: string | null) {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/stagehand/auth-status?sessionId=${sessionId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') {
          console.log('Connected to auth status stream');
        } else if (data.type === 'auth-update') {
          setAuthState(data.state);
        }
      } catch (error) {
        console.error('Error parsing auth status:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('Auth status connection error');
      setIsConnected(false);
      eventSource.close();

      // Retry connection after 5 seconds
      setTimeout(() => connect(), 5000);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [sessionId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { authState, isConnected };
}
