import { NextRequest, NextResponse } from "next/server";

/**
 * GitHub proxy API to avoid CORS issues when downloading repositories
 *
 * @param request The incoming Next.js request
 * @returns Response with the GitHub content or error
 */
export async function GET(request: NextRequest) {
  try {
    // Get URL parameters
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const branch = searchParams.get("branch") || "main";

    // Validate required parameters
    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing required parameters: owner and repo" }, { status: 400 });
    }

    // Construct the GitHub download URL
    const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip`;

    // Fetch the ZIP file from GitHub
    const response = await fetch(zipUrl, {
      headers: {
        // Adding a user agent to avoid GitHub API rate limits
        "User-Agent": "Swift-Web-App",
      },
    });

    // Check if request was successful
    if (!response.ok) {
      if (response.status === 404 && branch === "main") {
        // If main branch doesn't exist, try master branch
        const masterZipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/master.zip`;
        const masterResponse = await fetch(masterZipUrl, {
          headers: {
            "User-Agent": "Swift-Web-App",
          },
        });

        if (!masterResponse.ok) {
          return NextResponse.json(
            { error: `Failed to download repository: ${masterResponse.statusText}` },
            { status: masterResponse.status },
          );
        }

        // Return the ZIP data with appropriate headers
        const arrayBuffer = await masterResponse.arrayBuffer();

        return new NextResponse(arrayBuffer, {
          status: 200,
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": `attachment; filename=${repo}-master.zip`,
          },
        });
      }

      return NextResponse.json(
        { error: `Failed to download repository: ${response.statusText}` },
        { status: response.status },
      );
    }

    // Get the ZIP content as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // Return the ZIP data with appropriate headers
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=${repo}-${branch}.zip`,
      },
    });
  } catch (error) {
    console.error("Error proxying GitHub repository:", error);
    return NextResponse.json(
      { error: `Error proxying GitHub repository: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 },
    );
  }
}
