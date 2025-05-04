import express from "express";
import cors from "cors";
import helmet from "helmet";
import { traceIdMiddleware } from "./middleware/traceId.js";
import { requestLoggerMiddleware } from "./middleware/logger.js";
import toolsRouter from "./routes/tools.js";
import { logInfo, logError } from "./utils/logger.js";

// Constants
const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = process.env.HOST || "0.0.0.0";
const SERVICE_NAME = "swift-api-server";
const SERVICE_VERSION = "1.0.0";

// Create Express app
const app = express();

// Apply middleware
// -- traceId middleware must be first to ensure all requests have a traceId
app.use(traceIdMiddleware);
// -- logger middleware to log all requests
app.use(requestLoggerMiddleware);
// -- security middleware
app.use(helmet());
app.use(cors());
// -- parse request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up basic health route
app.get("/health", (req, res) => {
  logInfo("Health check request", req.traceId);
  return res.status(200).json({
    status: "ok",
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
  });
});

// Register routes
app.use("/api/v1/tools", toolsRouter);

// Catch-all route for 404s
app.use((req, res) => {
  logInfo(`404 - Route not found: ${req.originalUrl}`, req.traceId);
  return res.status(404).json({
    status: "error",
    message: "Route not found",
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logError(`Server error: ${err.message}`, req.traceId, err);

  return res.status(500).json({
    status: "error",
    message: "Internal server error",
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
  });
});

// Start server
app.listen(PORT, HOST, () => {
  const serverTraceId = "server-startup";
  logInfo(`Swift API Server running on http://${HOST}:${PORT}`, serverTraceId, {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
  });
});
