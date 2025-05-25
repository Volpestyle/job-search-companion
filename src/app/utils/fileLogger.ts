/**
 * File-based logging extension for debugging
 */

import fs from 'fs/promises';
import path from 'path';
import { logger as baseLogger } from './logger';

const DEFAULT_LOG_DIR = path.join(process.cwd(), 'agent-logs');

// Parse session ID to determine log directory and filename
function parseSessionPath(sessionId: string): { dir: string; filename: string } {
  // Check if sessionId contains a path
  if (sessionId.includes('/')) {
    const pathParts = sessionId.split('/');
    const filename = pathParts.pop() || 'unknown';
    const dir = path.join(process.cwd(), ...pathParts);
    return { dir, filename };
  }
  
  // Default behavior for simple session IDs
  return { dir: DEFAULT_LOG_DIR, filename: sessionId };
}

// Ensure log directory exists
async function ensureLogDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

// Write log entry to file
async function writeToFile(sessionId: string, entry: any) {
  const { dir, filename } = parseSessionPath(sessionId);
  await ensureLogDir(dir);

  const timestamp = new Date().toISOString();
  const fileName = `${filename}.log`;
  const filePath = path.join(dir, fileName);

  const logLine = `[${timestamp}] ${JSON.stringify(entry)}\n`;

  try {
    // Use appendFileSync for critical logs to ensure they're written
    await fs.appendFile(filePath, logLine);
    
    // Update the "latest" symlink to point to this log
    const latestPath = path.join(dir, 'latest.log');
    try {
      // Remove existing symlink if it exists
      await fs.unlink(latestPath).catch(() => {});
      // Create new symlink
      await fs.symlink(fileName, latestPath);
    } catch (symlinkError) {
      // Symlink creation might fail on Windows, ignore
    }
  } catch (error) {
    console.error('Failed to write log to file:', error);
    // Try sync write as fallback
    try {
      require('fs').appendFileSync(filePath, logLine);
    } catch (syncError) {
      console.error('Sync write also failed:', syncError);
    }
  }
}

// Store original console methods
const originalConsole = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  debug: console.debug.bind(console),
};

// Track if console is already intercepted
let isIntercepted = false;
let currentSessionId: string | null = null;

// Intercept console output
function interceptConsole(sessionId: string) {
  if (isIntercepted && currentSessionId === sessionId) return;
  
  currentSessionId = sessionId;
  isIntercepted = true;

  // Override console methods to capture ALL output
  console.log = (...args: any[]) => {
    originalConsole.log(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    writeToFile(sessionId, { level: 'console.log', message });
  };

  console.error = (...args: any[]) => {
    originalConsole.error(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    writeToFile(sessionId, { level: 'console.error', message });
  };

  console.warn = (...args: any[]) => {
    originalConsole.warn(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    writeToFile(sessionId, { level: 'console.warn', message });
  };

  console.debug = (...args: any[]) => {
    originalConsole.debug(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    writeToFile(sessionId, { level: 'console.debug', message });
  };
}

// Restore original console
export function restoreConsole() {
  if (!isIntercepted) return;
  
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.debug = originalConsole.debug;
  
  isIntercepted = false;
  currentSessionId = null;
}

// Create a logger that writes to both console and file
export function createFileLogger(sessionId: string) {
  // Start intercepting console output
  interceptConsole(sessionId);

  return {
    debug: (message: string, meta?: any) => {
      // Only write to file for debug, don't clutter console
      writeToFile(sessionId, { level: 'debug', message, meta });
    },
    info: (message: string, meta?: any) => {
      baseLogger.info(message, meta);
      writeToFile(sessionId, { level: 'info', message, meta });
    },
    warn: (message: string, meta?: any) => {
      baseLogger.warn(message, meta);
      writeToFile(sessionId, { level: 'warn', message, meta });
    },
    error: (message: string, meta?: any) => {
      baseLogger.error(message, meta);
      writeToFile(sessionId, { level: 'error', message, meta });
    },
    progress: (step: string, message: string, percentage?: number) => {
      baseLogger.progress(step, message, percentage, sessionId);
      writeToFile(sessionId, { level: 'progress', step, message, percentage });
    },
  };
}

// Get recent logs for a session
export async function getSessionLogs(sessionId: string): Promise<string[]> {
  try {
    const { dir, filename } = parseSessionPath(sessionId);
    const filePath = path.join(dir, `${filename}.log`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').filter((line) => line.trim());
  } catch (error) {
    return [];
  }
}

// List all log sessions
export async function listLogSessions(logDir?: string): Promise<string[]> {
  try {
    const dir = logDir ? path.join(process.cwd(), logDir) : DEFAULT_LOG_DIR;
    await ensureLogDir(dir);
    const files = await fs.readdir(dir);
    return files.filter((f) => f.endsWith('.log')).map((f) => f.replace('.log', ''));
  } catch (error) {
    return [];
  }
}
