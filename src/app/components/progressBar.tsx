'use client';

import { useProgress } from '../hooks/useProgress';
import { CheckCircle, Circle, Loader } from 'lucide-react';

interface ProgressBarProps {
  sessionId?: string;
}

const PROGRESS_STEPS = [
  {
    key: 'initialization',
    label: 'Initializing',
    description: 'Setting up browser and checking Ollama',
  },
  { key: 'search', label: 'Searching', description: 'Navigating and entering search criteria' },
  { key: 'extraction', label: 'Extracting', description: 'Analyzing job listings with AI' },
];

export default function ProgressBar({ sessionId = 'default' }: ProgressBarProps) {
  const { currentProgress, progress } = useProgress(sessionId);

  if (!currentProgress || currentProgress.percentage === undefined) {
    return null;
  }

  const currentStepIndex = PROGRESS_STEPS.findIndex((step) => step.key === currentProgress.step);

  return (
    <div className="mb-6 p-6 bg-[var(--input)] rounded-lg border border-[var(--border)]">
      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-[var(--foreground)]">
            {currentProgress.message}
          </h3>
          <span className="text-sm text-[var(--muted-foreground)]">
            {currentProgress.percentage}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${currentProgress.percentage}%` }}
          >
            <div className="h-full bg-white/20 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          {PROGRESS_STEPS.map((step, index) => {
            const isCompleted = currentStepIndex > index || currentProgress.percentage === 100;
            const isCurrent = currentStepIndex === index;
            const isPending = currentStepIndex < index;

            return (
              <div key={step.key} className="flex-1 flex items-center">
                <div className="relative flex flex-col items-center w-full">
                  {/* Step Icon */}
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${isCompleted ? 'bg-green-600' : isCurrent ? 'bg-blue-600' : 'bg-gray-600'}
                    `}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-white" />
                    ) : isCurrent ? (
                      <Loader className="w-5 h-5 text-white animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Step Label */}
                  <div className="mt-2 text-center">
                    <div
                      className={`text-xs font-medium ${
                        isCompleted || isCurrent
                          ? 'text-[var(--foreground)]'
                          : 'text-[var(--muted-foreground)]'
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[120px]">
                      {step.description}
                    </div>
                  </div>
                </div>

                {/* Connector Line */}
                {index < PROGRESS_STEPS.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-[2px] -z-10">
                    <div
                      className={`
                        h-full transition-all duration-500
                        ${isCompleted ? 'bg-green-600' : 'bg-gray-600'}
                      `}
                      style={{
                        width: isCompleted ? '100%' : isCurrent ? '50%' : '0%',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {progress.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)] space-y-1">
            {progress.slice(-3).map((update, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="opacity-60">
                  {new Date(update.timestamp || '').toLocaleTimeString()}
                </span>
                <span>{update.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
