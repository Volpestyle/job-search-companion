"use client";

import { useState } from 'react';
import { clientOllamaConfig, clientStagehandConfig, clientAwsConfig } from '../config/client-env';

interface DebugPanelProps {
  isVisible?: boolean;
}

export default function DebugPanel({ isVisible = false }: DebugPanelProps) {
  const [visible, setVisible] = useState(isVisible);

  if (!visible) {
    return (
      <button 
        onClick={() => setVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-900 text-gray-300 p-2 rounded-md text-xs opacity-50 hover:opacity-100"
      >
        Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-950 border border-gray-800 p-4 rounded-md text-gray-300 shadow-lg max-w-md max-h-96 overflow-auto">
      <div className="flex justify-between mb-4">
        <h3 className="text-sm font-medium">Debug Panel</h3>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-500 hover:text-gray-300"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4 text-xs">
        <section>
          <h4 className="text-gray-400 mb-1">Environment Info</h4>
          <div className="bg-gray-900 p-2 rounded">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-gray-500">Mode:</span>
              <span className="col-span-2">
                {process.env.NODE_ENV || 'development'}
              </span>

              <span className="text-gray-500">Runtime:</span>
              <span className="col-span-2">
                {typeof window === 'undefined' ? 'Server' : 'Client'}
              </span>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-gray-400 mb-1">Ollama Configuration</h4>
          <div className="bg-gray-900 p-2 rounded">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-gray-500">Host:</span>
              <span className="col-span-2">{clientOllamaConfig.host}</span>

              <span className="text-gray-500">Port:</span>
              <span className="col-span-2">{clientOllamaConfig.port}</span>

              <span className="text-gray-500">Model:</span>
              <span className="col-span-2">{clientOllamaConfig.modelName}</span>
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-gray-400 mb-1">Stagehand Configuration</h4>
          <div className="bg-gray-900 p-2 rounded">
            <div className="grid grid-cols-3 gap-1">
              <span className="text-gray-500">Environment:</span>
              <span className="col-span-2">{clientStagehandConfig.environment}</span>

              <span className="text-gray-500">Mock Data:</span>
              <span className="col-span-2">{clientStagehandConfig.useMock ? "Enabled" : "Disabled"}</span>

              {clientStagehandConfig.environment === "AWS" && (
                <>
                  <span className="text-gray-500">AWS:</span>
                  <span className="col-span-2">
                    {clientAwsConfig.isConfigured ? "Configured" : "Not Configured"}
                  </span>

                  <span className="text-gray-500">Region:</span>
                  <span className="col-span-2">
                    {clientAwsConfig.region}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        <section>
          <h4 className="text-gray-400 mb-1">Actions</h4>
          <div className="flex space-x-2">
            <button
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
              onClick={() => console.log("Client environment:", {
                node_env: process.env.NODE_ENV,
                next_runtime: process.env.NEXT_RUNTIME,
                isBrowser: typeof window !== 'undefined'
              })}
            >
              Log Info
            </button>
            <button
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Clear Storage
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}