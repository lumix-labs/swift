import { NextResponse } from "next/server";

/**
 * Health check endpoint for the web application
 * Used by Docker health checks to verify the service is running
 */
export async function GET() {
  console.warn("Health check endpoint called at", new Date().toISOString());

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "web",
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV,
    },
    { status: 200 },
  );
}
