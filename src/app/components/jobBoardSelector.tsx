'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { JobBoardConfig } from '@/app/types/general-types';

// Common job boards - hardcoded for now
const COMMON_JOB_BOARDS: JobBoardConfig[] = [
  {
    name: 'LinkedIn',
    url: 'https://www.linkedin.com/jobs/',
    customService: true,
  },
  {
    name: 'Indeed',
    url: 'https://www.indeed.com/',
  },
  {
    name: 'Glassdoor',
    url: 'https://www.glassdoor.com/Job/index.htm',
  },
  {
    name: 'AngelList',
    url: 'https://angel.co/jobs',
  },
  {
    name: 'Dice',
    url: 'https://www.dice.com/',
  },
  {
    name: 'Monster',
    url: 'https://www.monster.com/',
  },
  {
    name: 'ZipRecruiter',
    url: 'https://www.ziprecruiter.com/',
  },
  {
    name: 'SimplyHired',
    url: 'https://www.simplyhired.com/',
  },
  {
    name: 'CareerBuilder',
    url: 'https://www.careerbuilder.com/',
  },
  {
    name: 'FlexJobs',
    url: 'https://www.flexjobs.com/',
  },
  {
    name: 'We Work Remotely',
    url: 'https://weworkremotely.com/',
  },
  {
    name: 'Remote.co',
    url: 'https://remote.co/remote-jobs/',
  },
];

interface JobBoardSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedBoards: JobBoardConfig[]) => void;
}

export function JobBoardSelector({ isOpen, onClose, onSave }: JobBoardSelectorProps) {
  const [selectedBoards, setSelectedBoards] = useState<string[]>([]);

  // Load saved boards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedJobBoards');
    if (saved) {
      try {
        const savedBoards = JSON.parse(saved) as JobBoardConfig[];
        setSelectedBoards(savedBoards.map((b) => b.name));
      } catch (error) {
        console.error('Error loading saved job boards:', error);
        // Default to LinkedIn if there's an error
        setSelectedBoards(['LinkedIn']);
      }
    } else {
      // Default to LinkedIn if nothing saved
      setSelectedBoards(['LinkedIn']);
    }
  }, [isOpen]);

  const handleToggleBoard = (boardName: string) => {
    setSelectedBoards((prev) =>
      prev.includes(boardName) ? prev.filter((name) => name !== boardName) : [...prev, boardName]
    );
  };

  const handleSave = () => {
    const selected = COMMON_JOB_BOARDS.filter((board) => selectedBoards.includes(board.name));

    // Save to localStorage
    localStorage.setItem('selectedJobBoards', JSON.stringify(selected));

    // Notify parent
    onSave(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Select Job Boards</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Board List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COMMON_JOB_BOARDS.map((board) => (
              <button
                key={board.name}
                onClick={() => handleToggleBoard(board.name)}
                className={`
                  flex items-center justify-between p-4 rounded-lg border transition-all
                  ${
                    selectedBoards.includes(board.name)
                      ? 'border-blue-500 bg-blue-500/10 text-white'
                      : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                `}
              >
                <div className="flex flex-col items-start">
                  <span className="font-medium">{board.name}</span>
                  <span className="text-xs text-gray-500 mt-1">{board.url}</span>
                </div>
                {selectedBoards.includes(board.name) && <Check className="w-5 h-5 text-blue-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedBoards.length} board{selectedBoards.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={selectedBoards.length === 0}
              className={`
                px-4 py-2 rounded-md font-medium transition-all
                ${
                  selectedBoards.length > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
