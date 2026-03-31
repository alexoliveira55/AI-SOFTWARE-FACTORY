import fs from "node:fs";
import path from "node:path";

// Resolve project root (two levels up from src/utils/)
const projectRoot = path.resolve(__dirname, "..", "..");

const logsDir = path.join(projectRoot, "logs");
const logFile = path.join(logsDir, "execution.log");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

type LogLevel = "INFO" | "ERROR" | "DEBUG";

/**
 * Format a log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

/**
 * Write a log entry to the log file and console
 */
function log(level: LogLevel, message: string): void {
  const formatted = formatMessage(level, message);

  // Print to console
  if (level === "ERROR") {
    console.error(formatted);
  } else {
    console.log(formatted);
  }

  // Append to log file
  fs.appendFileSync(logFile, formatted + "\n", "utf-8");
}

export const logger = {
  info: (message: string) => log("INFO", message),
  error: (message: string) => log("ERROR", message),
  debug: (message: string) => log("DEBUG", message),
};
