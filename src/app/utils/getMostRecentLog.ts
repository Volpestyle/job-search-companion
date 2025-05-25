/**
 * Get the most recent log file from agent-logs directory
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'agent-logs');

export function getMostRecentLog(): string | null {
  try {
    // Read all files in the log directory
    const files = fs.readdirSync(LOG_DIR);
    
    // Filter for log files and get their stats
    const logFiles = files
      .filter(file => file.endsWith('.log'))
      .map(file => {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime.getTime()
        };
      });
    
    // Sort by modification time (newest first)
    logFiles.sort((a, b) => b.mtime - a.mtime);
    
    // Return the most recent log file path
    return logFiles.length > 0 ? logFiles[0].path : null;
  } catch (error) {
    console.error('Error getting most recent log:', error);
    return null;
  }
}

export function readMostRecentLog(): string | null {
  const logPath = getMostRecentLog();
  if (!logPath) return null;
  
  try {
    return fs.readFileSync(logPath, 'utf-8');
  } catch (error) {
    console.error('Error reading log file:', error);
    return null;
  }
}

// CLI usage
if (require.main === module) {
  const logPath = getMostRecentLog();
  if (logPath) {
    console.log(`Most recent log: ${logPath}`);
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n');
    console.log(`Total lines: ${lines.length}`);
    console.log('\nLast 50 lines:');
    console.log(lines.slice(-50).join('\n'));
  } else {
    console.log('No log files found');
  }
}