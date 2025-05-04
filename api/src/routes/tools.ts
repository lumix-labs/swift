import { Router, Request, Response } from "express";
import { logInfo } from "../utils/logger.js";

const router = Router();

// Mock data for MCP tools
const mcpTools = [
  {
    id: "uuid-generator",
    name: "UUID Generator",
    description: "Generates one or more UUIDs with various format options",
    version: "1.0.0",
  },
  {
    id: "repo-analyzer",
    name: "Repository Analyzer",
    description: "Analyzes repository structure and composition, providing insights for technical leadership",
    version: "1.0.0",
  },
  {
    id: "security-analyzer",
    name: "Security Analyzer",
    description:
      "Analyzes codebases for security vulnerabilities and provides risk scoring with remediation recommendations",
    version: "1.0.0",
  },
  {
    id: "store-analytics",
    name: "Store Analytics",
    description: "Stores analytics data from tools in a standardized format",
    version: "1.0.0",
  },
  {
    id: "get-analytics",
    name: "Get Analytics",
    description: "Retrieves analytics data stored by tools",
    version: "1.0.0",
  },
];

/**
 * GET /api/v1/tools
 * Returns a list of all available MCP tools
 */
router.get("/", (req: Request, res: Response) => {
  logInfo("Retrieving tools list", req.traceId);

  return res.status(200).json({
    status: "success",
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    data: {
      tools: mcpTools,
    },
  });
});

/**
 * GET /api/v1/tools/:id
 * Returns details for a specific tool
 */
router.get("/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  logInfo(`Retrieving tool with ID: ${id}`, req.traceId);

  const tool = mcpTools.find((tool) => tool.id === id);

  if (!tool) {
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toISOString(),
      traceId: req.traceId,
      message: `Tool with ID ${id} not found`,
    });
  }

  return res.status(200).json({
    status: "success",
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    data: {
      tool,
    },
  });
});

export default router;
