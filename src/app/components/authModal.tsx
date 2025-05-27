'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Loader2, Key, Globe } from 'lucide-react';
import { AuthState } from '@/lib/auth/auth-flow-manager';

interface AuthModalProps {
  authState: AuthState | null;
  onClose?: () => void;
}

export function AuthModal({ authState, onClose }: AuthModalProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show modal when auth is required or in progress
    if (authState && ['required', 'in-progress'].includes(authState.status)) {
      setShow(true);
    } else if (authState?.status === 'completed') {
      // Keep showing for a moment to show success
      setTimeout(() => setShow(false), 2000);
    } else {
      setShow(false);
    }
  }, [authState]);

  if (!show || !authState) return null;

  const getStatusIcon = () => {
    switch (authState.status) {
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'required':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'in-progress':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getAuthTypeIcon = () => {
    if (!authState.details?.authType) return null;

    switch (authState.details.authType) {
      case 'email-password':
        return <Key className="w-4 h-4" />;
      case 'oauth':
        return <Globe className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <h2 className="text-xl font-semibold text-white">
              {authState.boardName} Authentication
            </h2>
          </div>
          {authState.status === 'completed' && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-gray-300">{authState.message}</p>

          {/* Auth details */}
          {authState.details && authState.status === 'required' && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              {authState.details.authType && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  {getAuthTypeIcon()}
                  <span>
                    {authState.details.authType === 'email-password' && 'Email & Password'}
                    {authState.details.authType === 'oauth' && 'Social Login Available'}
                    {authState.details.authType === 'unknown' && 'Multiple Options Available'}
                  </span>
                </div>
              )}

              {authState.details.availableActions &&
                authState.details.availableActions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">
                      Available Actions:
                    </p>
                    <ul className="text-sm text-gray-400 space-y-1">
                      {authState.details.availableActions.map((action, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-gray-600 mr-2">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}

          {/* Status-specific messages */}
          {authState.status === 'in-progress' && (
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Waiting for authentication to complete...</span>
            </div>
          )}

          {authState.status === 'completed' && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>Authentication successful! Continuing job search...</span>
            </div>
          )}

          {authState.status === 'failed' && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-400">
                Authentication failed or timed out. Please try again.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {authState.status === 'required' && (
          <div className="px-6 py-4 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Complete the authentication in the browser window that opened. This modal will update
              automatically when you're logged in.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
