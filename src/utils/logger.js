// logger.js — Winston Logger Configuration
// Logs to both console and file

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Get current date for log filename
function getLogFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `server-${year}-${month}-${day}.log`;
}

// Custom format to match existing console logs
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
  // Remove timestamp from message if it already exists
  return `${message}`;
});

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    customFormat
  ),
  transports: [
    // Write to file
    new winston.transports.File({
      filename: path.join(logsDir, getLogFileName()),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Write to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    })
  ]
});

// Override console.log, console.error, console.warn to use winston
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  logger.info(message);
};

console.error = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  logger.error(message);
};

console.warn = function(...args) {
  const message = args.map(arg => 
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');
  logger.warn(message);
};

// Export logger for direct use if needed
module.exports = {
  logger,
  logsDir,
  getLogFileName,
  // Restore original console methods if needed
  restoreConsole: () => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
};

