import winston from "winston";
import path from "path";
import fs from "fs";

// Ensure logs directory exists
const logsDir = "/logs";
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    // Use winston logger once initialized, avoid direct console calls
    // Error logging will happen further down
    // Fall back to local logs directory if mounted volume is not available
    fs.mkdirSync("logs", { recursive: true });
  }
}

// Define custom log format with trace ID
const logFormat = winston.format.printf(({ level, message, timestamp, traceId, type }) => {
  return `${timestamp} [${level.toUpperCase()}] [${traceId || "NO_TRACE_ID"}] [${type || "SERVER"}]: ${message}`;
});

// Create Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.json(),
  ),
  defaultMeta: { service: "api-server" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        logFormat,
      ),
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, "api-server.log"),
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        winston.format.json(),
      ),
    }),
    // File transport for error logs
    new winston.transports.File({
      filename: path.join(logsDir, "api-server-error.log"),
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
        winston.format.json(),
      ),
    }),
  ],
});

// Define type for request data
interface RequestData {
  path?: string;
  method?: string;
  ip?: string;
  [key: string]: unknown;
}

// Helper functions for different log types
export const logRequest = (message: string, traceId: string, req?: RequestData) => {
  logger.info(message, {
    traceId,
    type: "REQUEST",
    path: req?.path,
    method: req?.method,
    ip: req?.ip,
  });
};

export const logResponse = (message: string, traceId: string, statusCode?: number, responseTime?: number) => {
  logger.info(message, {
    traceId,
    type: "RESPONSE",
    statusCode,
    responseTime,
  });
};

export const logError = (message: string, traceId: string, error?: Error) => {
  logger.error(message, {
    traceId,
    type: "ERROR",
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  });
};

// Define type for metadata
interface LogMetadata {
  [key: string]: unknown;
}

export const logInfo = (message: string, traceId: string, metadata?: LogMetadata) => {
  logger.info(message, {
    traceId,
    type: "INFO",
    ...metadata,
  });
};

export default logger;
