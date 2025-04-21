import { Request, Response, NextFunction } from 'express';
import { logRequest, logResponse } from '../utils/logger.js';

/**
 * Middleware to log incoming requests and outgoing responses
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add start time to request
  req.startTime = Date.now();
  
  // Log request
  logRequest(`${req.method} ${req.originalUrl}`, req.traceId, {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    headers: req.headers,
    query: req.query,
    params: req.params,
    // Don't log request body for security reasons
  });
  
  // Capture the original response end method
  const originalEnd = res.end;
  
  // Override the end method properly handling all overload signatures
  res.end = function(this: Response, chunk?: unknown, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
    // Calculate response time
    const responseTime = Date.now() - (req.startTime ?? Date.now());
    
    // Log response
    logResponse(`${req.method} ${req.originalUrl} - ${res.statusCode}`, req.traceId, res.statusCode, responseTime);
    
    // Call original end method with correct handling of overloads
    if (typeof encoding === 'function') {
      return originalEnd.call(this as Response, chunk, null as BufferEncoding, encoding);
    }
    return originalEnd.call(this as Response, chunk, encoding as BufferEncoding, cb);
  };
  
  next();
};
