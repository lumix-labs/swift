import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Health Check",
  description: "Health check endpoint for the web application",
};

export default function HealthPage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Service Status: Healthy</h1>
      <p className="mt-2">The web application is running correctly.</p>
      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <pre>
          {JSON.stringify(
            {
              status: "ok",
              timestamp: new Date().toISOString(),
              service: "web",
              version: "0.1.0",
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
}
