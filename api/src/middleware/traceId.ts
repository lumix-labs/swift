import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

/**
 * Middleware to add a trace ID to each request
 * The trace ID is added to the request object and the response headers
 */
export const traceIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate a new trace ID
  const traceId = uuidv4();

  // Add trace ID to request object
  req.traceId = traceId;

  // Add trace ID to response headers
  res.setHeader("X-Trace-ID", traceId);

  next();
};

// Extend Express Request interface to include traceId
// Using module augmentation instead of namespace
declare module "express" {
  interface Request {
    traceId: string;
    startTime?: number;
  }
}
