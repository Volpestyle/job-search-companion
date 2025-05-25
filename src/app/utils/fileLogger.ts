/**
 * File-based logging extension for debugging
 */

import fs from 'fs/promises';
import path from 'path';
import { logger as baseLogger } from './logger';

const LOG_DIR = path.join(process.cwd(), 'agent-logs');

// Ensure log directory exists
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

// Write log entry to file
async function writeToFile(sessionId: string, entry: any) {
  await ensureLogDir();

  const timestamp = new Date().toISOString();
  const fileName = `${sessionId}.log`;
  const filePath = path.join(LOG_DIR, fileName);

  const logLine = `[${timestamp}] ${JSON.stringify(entry)}\n`;

  try {
    await fs.appendFile(filePath, logLine);
  } catch (error) {
    console.error('Failed to write log to file:', error);
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

// Get recent logs for a session
export async function getSessionLogs(sessionId: string): Promise<string[]> {
  try {
    const filePath = path.join(LOG_DIR, `${sessionId}.log`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').filter((line) => line.trim());
  } catch (error) {
    return [];
  }
}

// List all log sessions
export async function listLogSessions(): Promise<string[]> {
  try {
    await ensureLogDir();
    const files = await fs.readdir(LOG_DIR);
    return files.filter((f) => f.endsWith('.log')).map((f) => f.replace('.log', ''));
  } catch (error) {
    return [];
  }
}
