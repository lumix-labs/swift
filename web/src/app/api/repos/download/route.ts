import { NextRequest, NextResponse } from "next/server";

/**
 * API route to proxy GitHub repository ZIP download requests
 * This avoids CORS issues when downloading repositories
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const repoUrl = searchParams.get("url");

  if (!repoUrl) {
    return NextResponse.json({ error: "Repository URL is required" }, { status: 400 });
  }

  try {
    // Validate GitHub URL format first
    if (!isValidGitHubUrl(repoUrl)) {
      return NextResponse.json(
        {
          error:
            "Invalid GitHub repository URL. Please provide a valid URL in the format: https://github.com/owner/repo",
        },
        { status: 400 },
      );
    }

    // Convert from a regular GitHub URL to a ZIP download URL
    const zipUrl = convertToZipUrl(repoUrl);

    console.log(`Converting ${repoUrl} to ${zipUrl}`);

    // Fetch the ZIP file
    const response = await fetch(zipUrl, {
      headers: {
        "User-Agent": "Swift-Web-Client",
      },
    });

    if (!response.ok) {
      console.error(`Failed to download repository: ${response.status} ${response.statusText}`);

      // Provide more helpful error messages based on HTTP status
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Repository not found. Please check that the repository exists and is public." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: `Failed to download repository: ${response.statusText}` },
        { status: response.status },
      );
    }

    // Stream the response back to the client
    const contentType = response.headers.get("content-type") || "application/zip";
    const contentLength = response.headers.get("content-length");
    const headers = new Headers();

    headers.set("Content-Type", contentType);
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(response.body, {
      headers,
      status: 200,
    });
  } catch (error) {
    console.error("Error downloading repository:", error);
    return NextResponse.json(
      { error: `Failed to download repository: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    );
  }
}

/**
 * Validates if a URL is a valid GitHub repository URL
 */
function isValidGitHubUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Make sure it's a GitHub URL
    if (!parsedUrl.hostname.includes("github.com")) {
      return false;
    }

    // Make sure there's a path with at least owner/repo
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Tries to detect and return the default branch for a GitHub repository
 * This function attempts multiple common branch names
 */
async function detectDefaultBranch(owner: string, repo: string): Promise<string> {
  // Common branch names to try
  const branchesToTry = ["main", "master", "develop", "trunk"];

  for (const branch of branchesToTry) {
    const testUrl = `https://github.com/${owner}/${repo}/tree/${branch}`;
    try {
      const response = await fetch(testUrl, {
        method: "HEAD",
        headers: {
          "User-Agent": "Swift-Web-Client",
        },
      });

      if (response.ok) {
        return branch;
      }
    } catch (error) {
      // Ignore errors and try next branch
      continue;
    }
  }

  // Default to "main" if cannot detect
  return "main";
}

/**
 * Extracts owner and repo from GitHub URL
 */
function extractOwnerAndRepo(url: string): { owner: string; repo: string } {
  try {
    const parsedUrl = new URL(url);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    if (pathParts.length >= 2) {
      return {
        owner: pathParts[0],
        repo: pathParts[1],
      };
    }

    throw new Error("Invalid GitHub URL format");
  } catch (error) {
    throw new Error("Could not extract owner and repo from URL");
  }
}

/**
 * Converts a GitHub repository URL to a ZIP download URL
 */
function convertToZipUrl(repoUrl: string): string {
  try {
    // Handle various GitHub URL formats
    // Remove trailing slash if present
    repoUrl = repoUrl.replace(/\/$/, "");

    // Check if it's already a ZIP URL
    if (repoUrl.endsWith(".zip")) {
      return repoUrl;
    }

    // If it's a GitHub URL, convert it to ZIP format
    if (repoUrl.includes("github.com")) {
      // Extract owner and repo
      const { owner, repo } = extractOwnerAndRepo(repoUrl);

      // Handle different GitHub URL formats
      if (repoUrl.includes("/tree/")) {
        // Specific branch
        // Extract branch name
        const branchMatch = repoUrl.match(/\/tree\/([^\/]+)/);
        if (branchMatch && branchMatch[1]) {
          return `https://github.com/${owner}/${repo}/archive/refs/heads/${branchMatch[1]}.zip`;
        }
      }

      // Default branch (main or master)
      // Try both main and master branches
      return `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
    }

    // Return the original URL if it doesn't match known patterns
    return repoUrl;
  } catch (error) {
    console.error("Error converting to ZIP URL:", error);
    return repoUrl;
  }
}
