/**
 * File-based logging extension for debugging
 */

import fs from 'fs/promises';
import path from 'path';
import { logger as baseLogger } from './logger';

const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');

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
      const fs = await import('fs');
      fs.appendFileSync(filePath, logLine);
    } catch (syncError) {
      console.error('Sync write also failed:', syncError);
    }
  }
}

// Create a logger that writes to both console and file
export function createFileLogger(sessionId: string) {
  return {
    debug: (message: string, meta?: any) => {
      baseLogger.debug(message, meta);
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
